-- ============================================================================
-- PURELA PROFITABILITY SCHEMA — v2
-- Target: Supabase (Postgres 15+)
--
-- Changes from v1:
--   * raw_tiktok_settlements now matches the actual 69-column TikTok export
--   * raw_tiktok_orders now matches the actual 63-column TikTok orders export
--   * Added `bundles` + `bundle_components` tables for bundle explosion
--   * Added `fact_orders_as_shipped` view (bundles exploded to components)
--   * Added `data_quality_*` views for the dashboard's Data Quality page
--   * Added `etl_rebuild_fact_orders()` function for idempotent re-runs
--   * Storage of original CSV files: handled via Supabase Storage, not in DB
--
-- Layers:
--   1. REFERENCE — products, costs, channels, bundles, sku mappings
--   2. RAW — exact mirrors of CSV/XLSX exports, one table per (channel, file type)
--   3. FACT — channel-agnostic, line-item grain, populated by ETL function
--   4. VIEWS — audit + data quality views over fact tables
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. REFERENCE LAYER
-- ----------------------------------------------------------------------------

CREATE TABLE channels (
    channel_id      TEXT PRIMARY KEY,
    channel_name    TEXT NOT NULL,
    is_marketplace  BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT
);

INSERT INTO channels (channel_id, channel_name, is_marketplace) VALUES
    ('tiktok_shop', 'TikTok Shop', TRUE),
    ('shopee',      'Shopee',      TRUE),
    ('tokopedia',   'Tokopedia',   TRUE),
    ('website',     'Direct Website', FALSE);


-- File-type registry. Tells the upload UI what kinds of files exist per channel
-- and what their expected headers are. Used for validation at staging step.
CREATE TABLE channel_file_types (
    file_type_id    TEXT PRIMARY KEY,            -- 'tiktok_income', 'tiktok_orders', etc.
    channel_id      TEXT NOT NULL REFERENCES channels(channel_id),
    display_name    TEXT NOT NULL,
    description     TEXT,
    raw_table_name  TEXT NOT NULL,               -- which raw_* table this populates
    expected_headers JSONB NOT NULL,             -- array of required column names
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO channel_file_types (file_type_id, channel_id, display_name, raw_table_name, expected_headers, description) VALUES
    ('tiktok_income',    'tiktok_shop', 'Income Statement (xlsx)',     'raw_tiktok_settlements',
     '["Order/adjustment ID  ", "Type ", "Order created time", "Order settled time", "Total settlement amount", "Subtotal before discounts", "Total Fees", "Platform commission fee", "Affiliate Commission"]',
     'Finance → Statements → Export. Contains per-order fee breakdown and settlement amounts.'),
    ('tiktok_orders',    'tiktok_shop', 'All Orders (csv)',            'raw_tiktok_orders',
     '["Order ID", "Order Status", "SKU ID", "Seller SKU", "Product Name", "Quantity", "SKU Subtotal Before Discount", "SKU Subtotal After Discount", "Created Time"]',
     'Orders → Export. Contains SKU, quantity, customer, status. Use Seller SKU as the join key with the bundles table.'),
    ('tiktok_returns',   'tiktok_shop', 'Returns/Refunds (csv)',       'raw_tiktok_returns',
     '["Return Order ID", "Order ID", "SKU ID", "Seller SKU", "Return Reason", "Return Quantity", "Return Status"]',
     'After-sales → Export. Contains return reasons and refund amounts.'),
    ('tiktok_affiliate', 'tiktok_shop', 'Affiliate Orders (csv)',      'raw_tiktok_affiliate',
     '["ID Pesanan", "Pembayaran Komisi Aktual", "Waktu Dibuat"]',
     'Affiliate → Performance → Export. Covers both creator-driven and affiliate-partner-driven exports — the row mapper auto-detects which shape and pulls the right columns. Headers are in Bahasa Indonesia for the ID locale.'),
    ('tiktok_ads',       'tiktok_shop', 'Ads Spend (csv)',             'raw_tiktok_ads',
     '["Campaign ID", "Campaign Name", "Date", "Spend", "Impressions", "Clicks"]',
     'TikTok Ads Manager → Campaigns → Export. NOT in Seller Center.');


CREATE TABLE products (
    sku             TEXT PRIMARY KEY,            -- canonical internal SKU
    product_name    TEXT NOT NULL,
    category        TEXT,                        -- e.g. 'lotion', 'cream', 'cleanser', 'pouch'
    unit_size       TEXT,                        -- '60ml', '185gr', etc.
    weight_grams    INTEGER,
    is_bundle       BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE if this SKU is a bundle
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    rsp_price       NUMERIC(15,2),               -- Recommended Selling Price (per Excel "RSP" / bundle "Mark Up")
    bottom_price    NUMERIC(15,2),               -- Floor price below which sales should be flagged
    notes           TEXT
);


-- COGS as a slowly-changing dimension. Required for accurate margin calculation.
CREATE TABLE product_costs (
    sku                 TEXT NOT NULL REFERENCES products(sku),
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    cogs_per_unit       NUMERIC(15,2) NOT NULL,
    packaging_per_unit  NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    PRIMARY KEY (sku, effective_from),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_product_costs_lookup ON product_costs (sku, effective_from DESC);


-- Bundle definitions. A bundle is a SKU that, when sold, ships as multiple
-- component SKUs. Critical for both COGS aggregation and stock reconciliation.
CREATE TABLE bundles (
    bundle_sku      TEXT PRIMARY KEY REFERENCES products(sku),
    bundle_name     TEXT NOT NULL,                -- e.g. 'Kiddy Shine', 'Combo Glowing Jumbo'
    notes           TEXT
);

CREATE TABLE bundle_components (
    bundle_sku      TEXT NOT NULL REFERENCES bundles(bundle_sku),
    component_sku   TEXT NOT NULL REFERENCES products(sku),
    quantity        INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (bundle_sku, component_sku),
    CHECK (quantity > 0)
);


-- Channel-specific SKU mapping.
-- TikTok's "Seller SKU" field can be:
--   (a) a single canonical internal SKU (e.g. "PUR-FW-100")
--   (b) a slightly-different format (e.g. "PURCG-100" vs "PUR-CG-100")
--   (c) a space-separated bundle string (e.g. "PUR-BL-185 PUR-SC-70 PUR-HL-60")
--   (d) something not yet in our products table (data quality issue)
-- This table maps every distinct external SKU we see → internal SKU.
-- For bundle strings, internal_sku points to a bundle entry in `products`/`bundles`.
CREATE TABLE channel_sku_mapping (
    channel_id          TEXT NOT NULL REFERENCES channels(channel_id),
    external_sku        TEXT NOT NULL,           -- as it appears in the export, verbatim
    external_product_id TEXT,                    -- e.g. TikTok's product_id
    internal_sku        TEXT REFERENCES products(sku),  -- NULL if unmapped
    PRIMARY KEY (channel_id, external_sku)
);


-- ----------------------------------------------------------------------------
-- 2. RAW LAYER
-- ----------------------------------------------------------------------------

-- Tracks every CSV/XLSX import for traceability and idempotent re-imports.
CREATE TABLE import_batches (
    batch_id        BIGSERIAL PRIMARY KEY,
    channel_id      TEXT NOT NULL REFERENCES channels(channel_id),
    file_type_id    TEXT NOT NULL REFERENCES channel_file_types(file_type_id),
    file_name       TEXT NOT NULL,
    file_hash       TEXT,                        -- SHA256 of file contents for dedup
    storage_path    TEXT,                        -- Supabase Storage path of original file
    period_start    DATE,                        -- min order_date detected
    period_end      DATE,                        -- max order_date detected
    row_count       INTEGER,
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imported_by     TEXT,                        -- pulled from session, e.g. 'shared-login'
    notes           TEXT,
    UNIQUE (channel_id, file_hash)
);


-- TikTok Shop: Income Statement / Settlement Report
-- Source: Seller Center → Finance → Statements → Export (xlsx, "Order details" sheet)
-- Column names match the 69-column export verbatim, including trailing spaces.
CREATE TABLE raw_tiktok_settlements (
    raw_id                          BIGSERIAL PRIMARY KEY,
    batch_id                        BIGINT REFERENCES import_batches(batch_id) ON DELETE CASCADE,

    order_adjustment_id             TEXT,        -- "Order/adjustment ID  " (trailing spaces in source)
    type                            TEXT,        -- "Order" | "Logistics reimbursement"
    order_created_time              DATE,        -- export uses yyyy/mm/dd
    order_settled_time              DATE,
    currency                        TEXT,        -- "IDR"

    -- Revenue side
    total_settlement_amount         NUMERIC(15,2),  -- what the platform paid out (key field)
    total_revenue                   NUMERIC(15,2),
    subtotal_after_seller_discounts NUMERIC(15,2),
    subtotal_before_discounts       NUMERIC(15,2),  -- this is gross GMV (key field)
    seller_discounts                NUMERIC(15,2),  -- negative
    distance_item_fee_horizon       NUMERIC(15,2),
    refund_subtotal_after_discounts NUMERIC(15,2),
    refund_subtotal_before_discounts NUMERIC(15,2),
    refund_of_seller_discounts      NUMERIC(15,2),

    -- Fees (all stored with their original sign — usually negative for outflows)
    total_fees                      NUMERIC(15,2),
    platform_commission_fee         NUMERIC(15,2),
    pre_order_service_fee           NUMERIC(15,2),
    mall_service_fee                NUMERIC(15,2),
    payment_fee                     NUMERIC(15,2),

    -- Shipping economics
    shipping_cost                   NUMERIC(15,2),
    shipping_costs_to_logistics     NUMERIC(15,2),
    replacement_shipping_to_customer NUMERIC(15,2),
    exchange_shipping_to_customer   NUMERIC(15,2),
    shipping_cost_borne_by_platform NUMERIC(15,2),
    shipping_cost_paid_by_customer  NUMERIC(15,2),
    refunded_shipping_paid_by_customer NUMERIC(15,2),
    return_shipping_to_customer     NUMERIC(15,2),
    shipping_cost_subsidy           NUMERIC(15,2),
    distance_shipping_horizon       NUMERIC(15,2),

    -- Affiliate
    affiliate_commission            NUMERIC(15,2),
    affiliate_partner_commission    NUMERIC(15,2),
    affiliate_shop_ads_commission   NUMERIC(15,2),
    affiliate_partner_shop_ads_commission NUMERIC(15,2),

    -- Service fees
    shipping_fee_program_service_fee NUMERIC(15,2),
    dynamic_commission              NUMERIC(15,2),
    bonus_cashback_service_fee      NUMERIC(15,2),
    live_specials_service_fee       NUMERIC(15,2),
    voucher_xtra_service_fee        NUMERIC(15,2),
    order_processing_fee            NUMERIC(15,2),
    eams_program_service_fee        NUMERIC(15,2),
    brands_crazy_deals_flash_sale_fee NUMERIC(15,2),
    dilayani_tokopedia_fee          NUMERIC(15,2),
    dilayani_tokopedia_handling_fee NUMERIC(15,2),
    paylater_program_fee            NUMERIC(15,2),
    campaign_resource_fee           NUMERIC(15,2),
    installation_service_fee        NUMERIC(15,2),
    article_22_income_tax_withheld  NUMERIC(15,2),
    platform_special_service_fee    NUMERIC(15,2),

    -- GMV Max (TikTok ad product, billed via settlement)
    gmv_max_ad_fee                  NUMERIC(15,2),
    gmv_max_coupon                  NUMERIC(15,2),
    gmv_max_coupon_sales_tax        NUMERIC(15,2),

    -- Managed service plans
    managed_service_plan_sales_tax  NUMERIC(15,2),
    managed_service_plan_per_order_fee NUMERIC(15,2),

    -- Adjustments / related
    adjustment_amount               NUMERIC(15,2),
    related_order_id                TEXT,        -- "Related order ID  " (trailing spaces in source)

    -- Vouchers
    customer_payment                NUMERIC(15,2),
    customer_refund                 NUMERIC(15,2),
    seller_cofunded_voucher_discount NUMERIC(15,2),
    refund_seller_cofunded_voucher  NUMERIC(15,2),
    platform_discounts              NUMERIC(15,2),
    refund_platform_discounts       NUMERIC(15,2),
    platform_cofunded_voucher_discounts NUMERIC(15,2),
    refund_platform_cofunded_voucher NUMERIC(15,2),
    seller_shipping_cost_discount   NUMERIC(15,2),

    -- Misc
    estimated_package_weight_g      INTEGER,
    actual_package_weight_g         INTEGER,
    shopping_center_items           TEXT,
    order_source                    TEXT,        -- 'TikTok' | 'Tokopedia' | 'TikTok Shop Mall' etc.

    raw_data                        JSONB,       -- catch-all for unmapped columns
    imported_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_tt_settle_order_id ON raw_tiktok_settlements (order_adjustment_id);
CREATE INDEX idx_raw_tt_settle_created  ON raw_tiktok_settlements (order_created_time);
CREATE INDEX idx_raw_tt_settle_batch    ON raw_tiktok_settlements (batch_id);


-- TikTok Shop: All Orders Report (csv)
-- Source: Seller Center → Orders → Export
-- One row per ORDER LINE ITEM (an order with N SKUs has N rows).
-- Columns match the 63-column export. Date format: dd/mm/yyyy with trailing tabs.
CREATE TABLE raw_tiktok_orders (
    raw_id                      BIGSERIAL PRIMARY KEY,
    batch_id                    BIGINT REFERENCES import_batches(batch_id) ON DELETE CASCADE,

    order_id                    TEXT,
    order_status                TEXT,            -- "Selesai", "Dibatalkan", "Dikirim", etc.
    order_substatus             TEXT,
    cancellation_return_type    TEXT,
    normal_or_preorder          TEXT,

    -- Product / SKU (THE KEY FIELDS)
    sku_id                      TEXT,            -- TikTok's internal SKU ID
    seller_sku                  TEXT,            -- merchant's SKU code; CAN BE A BUNDLE STRING
    product_name                TEXT,
    variation                   TEXT,
    quantity                    INTEGER,
    sku_quantity_of_return      INTEGER,

    -- Money
    sku_unit_original_price     NUMERIC(15,2),
    sku_subtotal_before_discount NUMERIC(15,2),
    sku_platform_discount       NUMERIC(15,2),
    sku_seller_discount         NUMERIC(15,2),
    sku_subtotal_after_discount NUMERIC(15,2),
    shipping_fee_after_discount NUMERIC(15,2),
    original_shipping_fee       NUMERIC(15,2),
    shipping_fee_seller_discount NUMERIC(15,2),
    shipping_fee_platform_discount NUMERIC(15,2),
    distance_shipping_fee       NUMERIC(15,2),
    distance_fee                NUMERIC(15,2),
    order_refund_amount         NUMERIC(15,2),
    payment_platform_discount   NUMERIC(15,2),
    buyer_service_fee           NUMERIC(15,2),
    handling_fee                NUMERIC(15,2),
    shipping_insurance          NUMERIC(15,2),
    item_insurance              NUMERIC(15,2),
    order_amount                NUMERIC(15,2),

    -- Timestamps (parsed from dd/mm/yyyy hh:mm:ss in source)
    created_time                TIMESTAMPTZ,
    paid_time                   TIMESTAMPTZ,
    rts_time                    TIMESTAMPTZ,    -- Ready To Ship
    shipped_time                TIMESTAMPTZ,
    delivered_time              TIMESTAMPTZ,
    cancelled_time              TIMESTAMPTZ,

    cancel_by                   TEXT,
    cancel_reason               TEXT,
    fulfillment_type            TEXT,
    warehouse_name              TEXT,
    tracking_id                 TEXT,
    delivery_option             TEXT,
    shipping_provider_name      TEXT,
    buyer_message               TEXT,

    -- Buyer info (kept for completeness; not used in audit)
    buyer_username              TEXT,
    recipient                   TEXT,
    phone                       TEXT,            -- "Phone #"
    zipcode                     TEXT,
    country                     TEXT,
    province                    TEXT,
    regency_and_city            TEXT,
    districts                   TEXT,
    villages                    TEXT,
    detail_address              TEXT,
    additional_address_info     TEXT,

    payment_method              TEXT,            -- "Bayar di tempat" (COD), "Transfer bank", etc.
    weight_kg                   NUMERIC(8,3),
    product_category            TEXT,
    package_id                  TEXT,
    purchase_channel            TEXT,            -- "TikTok" | "Tokopedia"
    seller_note                 TEXT,
    checked_status              TEXT,
    checked_marked_by           TEXT,
    tokopedia_invoice_number    TEXT,

    raw_data                    JSONB,
    imported_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_tt_orders_order_id   ON raw_tiktok_orders (order_id);
CREATE INDEX idx_raw_tt_orders_seller_sku ON raw_tiktok_orders (seller_sku);
CREATE INDEX idx_raw_tt_orders_created    ON raw_tiktok_orders (created_time);
CREATE INDEX idx_raw_tt_orders_batch      ON raw_tiktok_orders (batch_id);


-- TikTok Shop: Returns/Refunds Report (csv)
-- Source: Seller Center → Orders → After-Sales → Export
CREATE TABLE raw_tiktok_returns (
    raw_id                      BIGSERIAL PRIMARY KEY,
    batch_id                    BIGINT REFERENCES import_batches(batch_id) ON DELETE CASCADE,

    return_order_id             TEXT,
    order_id                    TEXT,
    order_amount                NUMERIC(15,2),
    order_status                TEXT,
    order_substatus             TEXT,
    payment_method              TEXT,
    sku_id                      TEXT,
    seller_sku                  TEXT,
    product_name                TEXT,
    sku_name                    TEXT,
    buyer_username              TEXT,
    return_type                 TEXT,            -- "Refund only", "Return and refund"
    time_requested              TIMESTAMPTZ,
    return_reason               TEXT,            -- the key field for return-cause analysis
    return_unit_price           NUMERIC(15,2),
    return_quantity             INTEGER,
    return_logistics_tracking_id TEXT,
    return_status               TEXT,
    return_sub_status           TEXT,
    refund_time                 TIMESTAMPTZ,
    dispute_status              TEXT,
    appeal_status               TEXT,
    compensation_status         TEXT,
    compensation_amount         NUMERIC(15,2),
    buyer_note                  TEXT,

    raw_data                    JSONB,
    imported_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_tt_returns_order_id ON raw_tiktok_returns (order_id);
CREATE INDEX idx_raw_tt_returns_batch    ON raw_tiktok_returns (batch_id);


-- TikTok Shop: Affiliate Orders (skeleton; refine when real export arrives)
CREATE TABLE raw_tiktok_affiliate (
    raw_id              BIGSERIAL PRIMARY KEY,
    batch_id            BIGINT REFERENCES import_batches(batch_id) ON DELETE CASCADE,
    order_id            TEXT,
    creator_username    TEXT,
    creator_id          TEXT,
    affiliate_type      TEXT,
    commission_rate     NUMERIC(5,3),
    commission_amount   NUMERIC(15,2),
    order_time          TIMESTAMPTZ,
    raw_data            JSONB,
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_tt_aff_order_id ON raw_tiktok_affiliate (order_id);
CREATE INDEX idx_raw_tt_aff_batch    ON raw_tiktok_affiliate (batch_id);


-- TikTok Ads Manager: campaign-level spend (skeleton; refine when real export arrives)
CREATE TABLE raw_tiktok_ads (
    raw_id              BIGSERIAL PRIMARY KEY,
    batch_id            BIGINT REFERENCES import_batches(batch_id) ON DELETE CASCADE,
    campaign_id         TEXT,
    campaign_name       TEXT,
    ad_group_id         TEXT,
    objective           TEXT,
    date                DATE,
    spend               NUMERIC(15,2),
    impressions         BIGINT,
    clicks              BIGINT,
    attributed_orders   INTEGER,
    attributed_gmv      NUMERIC(15,2),
    raw_data            JSONB,
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_tt_ads_date  ON raw_tiktok_ads (date);
CREATE INDEX idx_raw_tt_ads_batch ON raw_tiktok_ads (batch_id);


-- Stock dashboard (skeleton; refine when real export arrives)
CREATE TABLE raw_stock_movements (
    raw_id              BIGSERIAL PRIMARY KEY,
    batch_id            BIGINT REFERENCES import_batches(batch_id) ON DELETE CASCADE,
    movement_time       TIMESTAMPTZ,
    sku                 TEXT,
    movement_type       TEXT,
    quantity_delta      INTEGER,
    reference_id        TEXT,
    reference_channel   TEXT,
    location            TEXT,
    notes               TEXT,
    raw_data            JSONB,
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_stock_sku_time ON raw_stock_movements (sku, movement_time);


-- ----------------------------------------------------------------------------
-- 3. FACT LAYER
--    fact_orders is the channel-agnostic source of truth. One row per
--    order line item AS SOLD (so a bundle stays as one row here; the
--    fact_orders_as_shipped view explodes bundles into components).
-- ----------------------------------------------------------------------------

CREATE TABLE fact_orders (
    -- Identity
    fact_order_id           BIGSERIAL PRIMARY KEY,
    channel_id              TEXT NOT NULL REFERENCES channels(channel_id),
    order_id                TEXT NOT NULL,
    order_line_id           TEXT NOT NULL,
    UNIQUE (channel_id, order_id, order_line_id),

    -- Timing
    order_date              DATE NOT NULL,
    order_created_at        TIMESTAMPTZ,
    settled_at              TIMESTAMPTZ,
    is_fully_settled        BOOLEAN NOT NULL DEFAULT FALSE,

    -- Status
    order_status            TEXT,                -- normalized: 'completed' | 'cancelled' | 'returned'
    is_returned             BOOLEAN NOT NULL DEFAULT FALSE,

    -- Product (the "as-sold" SKU; may be a bundle)
    external_sku            TEXT,                -- raw value from the channel's export
    sku                     TEXT REFERENCES products(sku),  -- mapped internal SKU; NULL if unmapped
    product_name            TEXT,
    is_bundle               BOOLEAN NOT NULL DEFAULT FALSE,
    quantity                INTEGER NOT NULL,

    -- Revenue side (positive numbers; what came in)
    gross_revenue           NUMERIC(15,2) NOT NULL,
    seller_discount         NUMERIC(15,2) NOT NULL DEFAULT 0,
    platform_discount       NUMERIC(15,2) NOT NULL DEFAULT 0,
    voucher_seller_funded   NUMERIC(15,2) NOT NULL DEFAULT 0,
    voucher_platform_funded NUMERIC(15,2) NOT NULL DEFAULT 0,
    shipping_paid_by_buyer  NUMERIC(15,2) NOT NULL DEFAULT 0,

    -- Cost side (positive numbers; what went out)
    platform_commission     NUMERIC(15,2) NOT NULL DEFAULT 0,
    transaction_fee         NUMERIC(15,2) NOT NULL DEFAULT 0,
    service_fee             NUMERIC(15,2) NOT NULL DEFAULT 0,  -- mall + processing + paylater + etc, summed
    affiliate_commission    NUMERIC(15,2) NOT NULL DEFAULT 0,
    shipping_cost_seller    NUMERIC(15,2) NOT NULL DEFAULT 0,
    return_shipping_cost    NUMERIC(15,2) NOT NULL DEFAULT 0,
    refund_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount              NUMERIC(15,2) NOT NULL DEFAULT 0,
    gmv_max_ad_fee          NUMERIC(15,2) NOT NULL DEFAULT 0,  -- when present in settlement

    -- Allocated costs (computed by ETL)
    cogs                    NUMERIC(15,2),       -- sum of component COGS for bundles
    packaging_cost          NUMERIC(15,2),
    ads_cost_attributed     NUMERIC(15,2) NOT NULL DEFAULT 0,  -- from raw_tiktok_ads, daily allocation

    -- Settlement (from raw_tiktok_settlements)
    net_settlement          NUMERIC(15,2),

    -- Computed economics
    effective_take_rate     NUMERIC(5,4),
    contribution_margin     NUMERIC(15,2),
    contribution_margin_pct NUMERIC(5,4),

    -- Lineage
    source_settlement_id    BIGINT REFERENCES raw_tiktok_settlements(raw_id) ON DELETE SET NULL,
    source_order_id         BIGINT REFERENCES raw_tiktok_orders(raw_id) ON DELETE SET NULL,
    last_recomputed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_orders_channel_date ON fact_orders (channel_id, order_date);
CREATE INDEX idx_fact_orders_sku          ON fact_orders (sku);
CREATE INDEX idx_fact_orders_settled      ON fact_orders (is_fully_settled, order_date);
CREATE INDEX idx_fact_orders_unmapped     ON fact_orders (channel_id) WHERE sku IS NULL;


-- View: fact_orders_as_shipped
-- Explodes bundles into their component SKUs. One row per (order_line, component_sku).
-- Used for stock reconciliation and per-component-SKU profitability.
-- COGS is per-component (already allocated in fact_orders.cogs as the bundle sum).
-- For revenue / fees, we allocate proportionally to component COGS within the bundle.
CREATE OR REPLACE VIEW fact_orders_as_shipped AS
WITH component_weights AS (
    -- For each bundle component, compute its COGS share within its bundle.
    SELECT
        bc.bundle_sku,
        bc.component_sku,
        bc.quantity AS component_qty,
        pc.cogs_per_unit + COALESCE(pc.packaging_per_unit, 0) AS component_unit_cost,
        SUM((bc.quantity * (pc.cogs_per_unit + COALESCE(pc.packaging_per_unit, 0))))
            OVER (PARTITION BY bc.bundle_sku) AS bundle_total_cost
    FROM bundle_components bc
    JOIN LATERAL (
        SELECT cogs_per_unit, packaging_per_unit
        FROM product_costs
        WHERE sku = bc.component_sku AND effective_to IS NULL
        ORDER BY effective_from DESC LIMIT 1
    ) pc ON TRUE
)
SELECT
    f.fact_order_id,
    f.channel_id,
    f.order_id,
    f.order_line_id,
    f.order_date,
    f.is_fully_settled,
    f.is_returned,
    -- Component or single SKU
    COALESCE(cw.component_sku, f.sku)        AS shipped_sku,
    f.quantity * COALESCE(cw.component_qty, 1) AS shipped_quantity,
    -- Revenue allocated by COGS share (or 1.0 for non-bundles)
    f.gross_revenue * COALESCE(
        (cw.component_qty * cw.component_unit_cost) / NULLIF(cw.bundle_total_cost, 0),
        1.0
    ) AS allocated_gross_revenue,
    f.net_settlement * COALESCE(
        (cw.component_qty * cw.component_unit_cost) / NULLIF(cw.bundle_total_cost, 0),
        1.0
    ) AS allocated_net_settlement
FROM fact_orders f
LEFT JOIN component_weights cw
    ON cw.bundle_sku = f.sku AND f.is_bundle;


-- Stock movements fact (channel-agnostic)
CREATE TABLE fact_stock_movements (
    fact_movement_id    BIGSERIAL PRIMARY KEY,
    movement_date       DATE NOT NULL,
    movement_time       TIMESTAMPTZ,
    sku                 TEXT NOT NULL REFERENCES products(sku),
    movement_type       TEXT NOT NULL,
    quantity_delta      INTEGER NOT NULL,
    source              TEXT NOT NULL,           -- 'stock_system' | 'derived_from_orders'
    reference_order_id  TEXT,
    reference_channel   TEXT REFERENCES channels(channel_id),
    location            TEXT,
    source_raw_id       BIGINT,
    last_recomputed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_stock_sku_date ON fact_stock_movements (sku, movement_date);
CREATE INDEX idx_fact_stock_source   ON fact_stock_movements (source, movement_date);


-- ----------------------------------------------------------------------------
-- 4. AUDIT VIEWS — power both the audit queries and the dashboard
-- ----------------------------------------------------------------------------

-- Effective take rate by channel by month
CREATE OR REPLACE VIEW v_audit_take_rate AS
SELECT
    channel_id,
    DATE_TRUNC('month', order_date)::DATE AS month,
    COUNT(*)                              AS line_items,
    SUM(gross_revenue)                    AS gross_revenue,
    SUM(seller_discount)                  AS seller_discount,
    SUM(net_settlement)                   AS net_settlement,
    (SUM(gross_revenue) - SUM(net_settlement)) / NULLIF(SUM(gross_revenue), 0) AS effective_take_rate
FROM fact_orders
WHERE is_fully_settled
GROUP BY channel_id, DATE_TRUNC('month', order_date);


-- Contribution margin by SKU by channel
CREATE OR REPLACE VIEW v_audit_sku_margin AS
SELECT
    channel_id,
    sku,
    product_name,
    COUNT(*)                       AS line_items,
    SUM(quantity)                  AS units_sold,
    SUM(gross_revenue)             AS gross_revenue,
    SUM(net_settlement)            AS net_settlement,
    SUM(cogs)                      AS total_cogs,
    SUM(packaging_cost)            AS total_packaging,
    SUM(ads_cost_attributed)       AS total_ads,
    SUM(contribution_margin)       AS total_cm,
    SUM(contribution_margin) / NULLIF(SUM(gross_revenue), 0) AS cm_pct
FROM fact_orders
WHERE is_fully_settled
GROUP BY channel_id, sku, product_name;


-- Return rate by SKU by channel
CREATE OR REPLACE VIEW v_audit_return_rate AS
SELECT
    channel_id,
    sku,
    product_name,
    COUNT(*)                                                              AS total_orders,
    SUM(CASE WHEN is_returned THEN 1 ELSE 0 END)                          AS returned_orders,
    SUM(CASE WHEN is_returned THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS return_rate,
    SUM(refund_amount)                                                    AS total_refund,
    SUM(return_shipping_cost)                                             AS total_return_shipping
FROM fact_orders
GROUP BY channel_id, sku, product_name;


-- Affiliate burden trend
CREATE OR REPLACE VIEW v_audit_affiliate_burden AS
SELECT
    channel_id,
    DATE_TRUNC('month', order_date)::DATE AS month,
    SUM(gross_revenue)                    AS gross_revenue,
    SUM(affiliate_commission)             AS total_affiliate,
    SUM(affiliate_commission) / NULLIF(SUM(gross_revenue), 0) AS affiliate_pct_of_gmv
FROM fact_orders
WHERE is_fully_settled
GROUP BY channel_id, DATE_TRUNC('month', order_date);


-- Voucher / discount burden trend (this is where Purela's biggest leak is)
CREATE OR REPLACE VIEW v_audit_discount_burden AS
SELECT
    channel_id,
    DATE_TRUNC('month', order_date)::DATE AS month,
    SUM(gross_revenue)                    AS gross_revenue,
    SUM(seller_discount)                  AS seller_discount,
    SUM(voucher_seller_funded)            AS seller_voucher,
    SUM(voucher_platform_funded)          AS platform_voucher,
    (SUM(seller_discount) + SUM(voucher_seller_funded)) / NULLIF(SUM(gross_revenue), 0) AS seller_funded_discount_pct
FROM fact_orders
WHERE is_fully_settled
GROUP BY channel_id, DATE_TRUNC('month', order_date);


-- Fee waterfall — single most important dashboard view
CREATE OR REPLACE VIEW v_audit_fee_waterfall AS
SELECT
    channel_id,
    DATE_TRUNC('month', order_date)::DATE AS month,
    SUM(gross_revenue)                                               AS gross_gmv,
    SUM(seller_discount + voucher_seller_funded)                     AS seller_funded_discounts,
    SUM(platform_commission)                                         AS platform_commission,
    SUM(affiliate_commission)                                        AS affiliate_commission,
    SUM(service_fee)                                                 AS service_fees,
    SUM(transaction_fee)                                             AS transaction_fees,
    SUM(shipping_cost_seller)                                        AS shipping_cost_seller,
    SUM(refund_amount)                                               AS refund_amount,
    SUM(tax_amount)                                                  AS tax,
    SUM(gmv_max_ad_fee)                                              AS gmv_max_ad_fee,
    SUM(net_settlement)                                              AS net_settlement,
    SUM(cogs)                                                        AS cogs,
    SUM(packaging_cost)                                              AS packaging,
    SUM(ads_cost_attributed)                                         AS ads_attributed,
    SUM(contribution_margin)                                         AS contribution_margin
FROM fact_orders
WHERE is_fully_settled
GROUP BY channel_id, DATE_TRUNC('month', order_date);


-- ----------------------------------------------------------------------------
-- 5. DATA QUALITY VIEWS — power the /data-quality dashboard page
-- ----------------------------------------------------------------------------

-- Which external SKUs from imports haven't been mapped yet
CREATE OR REPLACE VIEW v_dq_unmapped_skus AS
SELECT
    f.channel_id,
    f.external_sku,
    COUNT(*) AS line_items,
    SUM(f.gross_revenue) AS unmapped_gmv,
    MIN(f.order_date) AS first_seen,
    MAX(f.order_date) AS last_seen
FROM fact_orders f
WHERE f.sku IS NULL
GROUP BY f.channel_id, f.external_sku;


-- SKUs missing COGS (margins for these are unreliable)
CREATE OR REPLACE VIEW v_dq_missing_cogs AS
SELECT
    f.channel_id,
    f.sku,
    f.product_name,
    COUNT(*) AS line_items,
    SUM(f.gross_revenue) AS impacted_gmv,
    MIN(f.order_date) AS first_seen,
    MAX(f.order_date) AS last_seen
FROM fact_orders f
WHERE f.sku IS NOT NULL AND f.cogs IS NULL
GROUP BY f.channel_id, f.sku, f.product_name;


-- Orders in the orders feed without a matching settlement row (still pending)
CREATE OR REPLACE VIEW v_dq_unsettled_orders AS
SELECT
    f.channel_id,
    f.order_id,
    f.order_date,
    f.gross_revenue,
    f.order_status
FROM fact_orders f
WHERE NOT f.is_fully_settled;


-- Bundle SKUs used in orders but missing a definition
CREATE OR REPLACE VIEW v_dq_undefined_bundles AS
SELECT DISTINCT
    csm.channel_id,
    csm.external_sku,
    csm.internal_sku
FROM channel_sku_mapping csm
LEFT JOIN bundles b ON b.bundle_sku = csm.internal_sku
LEFT JOIN products p ON p.sku = csm.internal_sku
WHERE csm.external_sku LIKE '% %'                    -- looks like a multi-SKU string
  AND (b.bundle_sku IS NULL OR p.is_bundle = FALSE);


-- Stock reconciliation: outflow per SKU per day from orders vs stock system
CREATE OR REPLACE VIEW v_dq_stock_reconciliation AS
WITH orders_outflow AS (
    SELECT
        order_date          AS movement_date,
        shipped_sku         AS sku,
        SUM(shipped_quantity) AS qty_from_orders
    FROM fact_orders_as_shipped
    WHERE NOT is_returned
    GROUP BY order_date, shipped_sku
),
stock_outflow AS (
    SELECT
        movement_date,
        sku,
        -SUM(quantity_delta) AS qty_from_stock_system
    FROM fact_stock_movements
    WHERE source = 'stock_system' AND movement_type = 'sale'
    GROUP BY movement_date, sku
)
SELECT
    COALESCE(o.movement_date, s.movement_date) AS movement_date,
    COALESCE(o.sku, s.sku)                     AS sku,
    COALESCE(o.qty_from_orders, 0)             AS qty_from_orders,
    COALESCE(s.qty_from_stock_system, 0)       AS qty_from_stock_system,
    COALESCE(o.qty_from_orders, 0) - COALESCE(s.qty_from_stock_system, 0) AS discrepancy
FROM orders_outflow o
FULL OUTER JOIN stock_outflow s
    ON o.movement_date = s.movement_date AND o.sku = s.sku;


-- ----------------------------------------------------------------------------
-- 6. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Look up COGS valid on a given date
CREATE OR REPLACE FUNCTION get_cogs(p_sku TEXT, p_date DATE)
RETURNS TABLE(cogs_per_unit NUMERIC, packaging_per_unit NUMERIC) AS $$
    SELECT cogs_per_unit, packaging_per_unit
    FROM product_costs
    WHERE sku = p_sku
      AND effective_from <= p_date
      AND (effective_to IS NULL OR effective_to >= p_date)
    ORDER BY effective_from DESC
    LIMIT 1;
$$ LANGUAGE SQL STABLE;


-- Bundle COGS sum (uses current effective costs)
CREATE OR REPLACE FUNCTION get_bundle_cogs(p_bundle_sku TEXT, p_date DATE)
RETURNS TABLE(total_cogs NUMERIC, total_packaging NUMERIC) AS $$
    SELECT
        SUM(bc.quantity * (gc.cogs_per_unit))            AS total_cogs,
        SUM(bc.quantity * (gc.packaging_per_unit))       AS total_packaging
    FROM bundle_components bc
    CROSS JOIN LATERAL get_cogs(bc.component_sku, p_date) gc
    WHERE bc.bundle_sku = p_bundle_sku;
$$ LANGUAGE SQL STABLE;


-- ETL: rebuild fact_orders for a given channel and date range.
-- Idempotent — deletes existing fact rows in scope, then re-derives from raw.
-- Called automatically after every import; can also be called manually after
-- updating reference data (COGS, bundles, SKU mapping).
--
-- Body is a stub here — fill in based on actual import workflow. The shape is:
--   1. DELETE FROM fact_orders WHERE channel_id = p_channel AND order_date BETWEEN p_from AND p_to;
--   2. INSERT INTO fact_orders ...
--      JOIN raw_tiktok_settlements s ON ...
--      LEFT JOIN raw_tiktok_orders o ON s.order_adjustment_id = o.order_id
--      LEFT JOIN channel_sku_mapping m ON ...
--      LEFT JOIN get_cogs(...) ON ...
--   3. UPDATE fact_orders SET effective_take_rate = ..., contribution_margin = ...;
CREATE OR REPLACE FUNCTION etl_rebuild_fact_orders(
    p_channel_id TEXT,
    p_date_from  DATE,
    p_date_to    DATE
) RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Idempotent: clear out existing fact rows in scope, then rebuild from raw.
    DELETE FROM fact_orders
    WHERE channel_id = p_channel_id
      AND order_date BETWEEN p_date_from AND p_date_to;

    -- TikTok Shop branch.
    -- One fact row per settlement record. Joins the orders feed when available
    -- to recover SKU-level detail; otherwise falls back to settlement-only data.
    IF p_channel_id = 'tiktok_shop' THEN
        INSERT INTO fact_orders (
            channel_id,
            order_id,
            order_line_id,
            order_date,
            order_created_at,
            settled_at,
            is_fully_settled,
            order_status,
            is_returned,
            external_sku,
            sku,
            product_name,
            is_bundle,
            quantity,
            gross_revenue,
            seller_discount,
            platform_discount,
            voucher_seller_funded,
            voucher_platform_funded,
            shipping_paid_by_buyer,
            platform_commission,
            transaction_fee,
            service_fee,
            affiliate_commission,
            shipping_cost_seller,
            return_shipping_cost,
            refund_amount,
            tax_amount,
            gmv_max_ad_fee,
            cogs,
            packaging_cost,
            net_settlement,
            source_settlement_id,
            source_order_id
        )
        SELECT
            'tiktok_shop'                                    AS channel_id,
            s.order_adjustment_id                            AS order_id,
            -- one settlement row = one "line"; if matched to orders, uses sku_id; else fallback to row id
            COALESCE(o.sku_id, s.order_adjustment_id || '#' || s.raw_id::text) AS order_line_id,
            s.order_created_time                             AS order_date,
            s.order_created_time::timestamptz                AS order_created_at,
            s.order_settled_time::timestamptz                AS settled_at,
            (s.total_settlement_amount IS NOT NULL)          AS is_fully_settled,
            CASE
                WHEN s.type ILIKE '%refund%'         THEN 'returned'
                WHEN o.order_status ILIKE '%batal%'  THEN 'cancelled'
                WHEN o.order_status ILIKE '%selesai%' THEN 'completed'
                ELSE COALESCE(o.order_status, s.type)
            END                                              AS order_status,
            COALESCE(
                (COALESCE(s.refund_subtotal_after_discounts, 0) <> 0
                 OR (o.order_status ILIKE '%refund%')),
                FALSE
            )                                                AS is_returned,
            o.seller_sku                                     AS external_sku,
            m.internal_sku                                   AS sku,
            o.product_name                                   AS product_name,
            COALESCE(p.is_bundle, FALSE)                     AS is_bundle,
            COALESCE(o.quantity, 1)                          AS quantity,
            COALESCE(s.subtotal_before_discounts, 0)         AS gross_revenue,
            ABS(COALESCE(s.seller_discounts, 0))             AS seller_discount,
            ABS(COALESCE(s.platform_discounts, 0))           AS platform_discount,
            ABS(COALESCE(s.seller_cofunded_voucher_discount, 0)) AS voucher_seller_funded,
            ABS(COALESCE(s.platform_cofunded_voucher_discounts, 0)) AS voucher_platform_funded,
            COALESCE(s.shipping_cost_paid_by_customer, 0)    AS shipping_paid_by_buyer,
            ABS(COALESCE(s.platform_commission_fee, 0))      AS platform_commission,
            ABS(COALESCE(s.payment_fee, 0))                  AS transaction_fee,
            ABS(
                COALESCE(s.mall_service_fee, 0) +
                COALESCE(s.order_processing_fee, 0) +
                COALESCE(s.shipping_fee_program_service_fee, 0) +
                COALESCE(s.bonus_cashback_service_fee, 0) +
                COALESCE(s.live_specials_service_fee, 0) +
                COALESCE(s.voucher_xtra_service_fee, 0) +
                COALESCE(s.eams_program_service_fee, 0) +
                COALESCE(s.platform_special_service_fee, 0) +
                COALESCE(s.paylater_program_fee, 0)
            )                                                AS service_fee,
            ABS(
                COALESCE(s.affiliate_commission, 0) +
                COALESCE(s.affiliate_partner_commission, 0)
            )                                                AS affiliate_commission,
            ABS(COALESCE(s.shipping_cost, 0))                AS shipping_cost_seller,
            ABS(COALESCE(s.return_shipping_to_customer, 0))  AS return_shipping_cost,
            ABS(COALESCE(s.refund_subtotal_after_discounts, 0)) AS refund_amount,
            ABS(COALESCE(s.article_22_income_tax_withheld, 0)) AS tax_amount,
            ABS(COALESCE(s.gmv_max_ad_fee, 0))               AS gmv_max_ad_fee,
            -- COGS: bundle-aware lookup
            CASE
                WHEN p.is_bundle THEN (
                    SELECT total_cogs
                    FROM get_bundle_cogs(m.internal_sku, s.order_created_time)
                ) * COALESCE(o.quantity, 1)
                WHEN m.internal_sku IS NOT NULL THEN (
                    SELECT cogs_per_unit
                    FROM get_cogs(m.internal_sku, s.order_created_time)
                ) * COALESCE(o.quantity, 1)
                ELSE NULL
            END                                              AS cogs,
            CASE
                WHEN p.is_bundle THEN (
                    SELECT total_packaging
                    FROM get_bundle_cogs(m.internal_sku, s.order_created_time)
                ) * COALESCE(o.quantity, 1)
                WHEN m.internal_sku IS NOT NULL THEN (
                    SELECT packaging_per_unit
                    FROM get_cogs(m.internal_sku, s.order_created_time)
                ) * COALESCE(o.quantity, 1)
                ELSE NULL
            END                                              AS packaging_cost,
            COALESCE(s.total_settlement_amount, 0)           AS net_settlement,
            s.raw_id                                         AS source_settlement_id,
            o.raw_id                                         AS source_order_id
        FROM raw_tiktok_settlements s
        LEFT JOIN raw_tiktok_orders o
            ON o.order_id = s.order_adjustment_id
        LEFT JOIN channel_sku_mapping m
            ON m.channel_id = 'tiktok_shop'
           AND m.external_sku = o.seller_sku
        LEFT JOIN products p
            ON p.sku = m.internal_sku
        WHERE s.order_created_time BETWEEN p_date_from AND p_date_to
          AND s.type IN ('Order', 'Logistics reimbursement');

        -- Derived economics
        UPDATE fact_orders
        SET
            effective_take_rate = CASE
                WHEN gross_revenue > 0
                THEN (gross_revenue - net_settlement) / gross_revenue
                ELSE NULL
            END,
            contribution_margin = COALESCE(net_settlement, 0)
                                  - COALESCE(cogs, 0)
                                  - COALESCE(packaging_cost, 0)
                                  - COALESCE(ads_cost_attributed, 0),
            contribution_margin_pct = CASE
                WHEN gross_revenue > 0
                THEN (COALESCE(net_settlement, 0)
                      - COALESCE(cogs, 0)
                      - COALESCE(packaging_cost, 0)
                      - COALESCE(ads_cost_attributed, 0)) / gross_revenue
                ELSE NULL
            END,
            last_recomputed_at = NOW()
        WHERE channel_id = 'tiktok_shop'
          AND order_date BETWEEN p_date_from AND p_date_to;
    END IF;

    -- Shopee, Tokopedia, Website branches: not yet implemented.
    -- Add IF p_channel_id = 'shopee' THEN ... END IF; blocks here.

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------------------
-- 7. STORAGE
--    Original uploaded files are kept in Supabase Storage at imports/{batch_id}/
--    (Bucket creation must run as the owner of the storage schema.)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Service role has full access to storage by default; no anon access.
-- All file operations go through Nuxt server routes using the service-role key.
