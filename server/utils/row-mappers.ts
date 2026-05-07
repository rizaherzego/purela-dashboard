// Row mappers: take a raw record (keys = source headers, possibly with trailing
// spaces) and return a record keyed by raw_* table columns.
//
// Only the most-used columns are mapped here. Anything not mapped is
// preserved in the row's `raw_data` JSONB field.

type Row = Record<string, any>

function num(v: any): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.\-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function int(v: any): number | null {
  const n = num(v)
  return n == null ? null : Math.round(n)
}

function txt(v: any): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

// Parse "yyyy/mm/dd" → ISO date string (used by TikTok income statement)
function parseSlashDate(v: any): string | null {
  const s = txt(v)
  if (!s) return null
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!m) {
    // fallback: try Date
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

// Parse "dd/mm/yyyy hh:mm:ss" → ISO timestamp (used by TikTok orders)
function parseDmyDateTime(v: any): string | null {
  const s = txt(v)
  if (!s) return null
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const [, dd, mm, yyyy, h = '0', mi = '0', se = '0'] = m
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${h.padStart(2, '0')}:${mi.padStart(2, '0')}:${se.padStart(2, '0')}+07:00`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ----------------------------------------------------------------------------
// TikTok Shop — Income Statement (xlsx)
// ----------------------------------------------------------------------------
export function mapTiktokSettlement(r: Row) {
  const get = (k: string) => r[k] ?? r[k + ' '] ?? r[k + '  '] ?? r[k.trim()]
  return {
    order_adjustment_id:             txt(get('Order/adjustment ID')),
    type:                            txt(get('Type')),
    order_created_time:              parseSlashDate(get('Order created time')),
    order_settled_time:              parseSlashDate(get('Order settled time')),
    currency:                        txt(get('Currency')),

    total_settlement_amount:         num(get('Total settlement amount')),
    total_revenue:                   num(get('Total revenue')),
    subtotal_after_seller_discounts: num(get('Subtotal after seller discounts')),
    subtotal_before_discounts:       num(get('Subtotal before discounts')),
    seller_discounts:                num(get('Seller discounts')),
    refund_subtotal_after_discounts: num(get('Refund subtotal after discounts')),
    refund_subtotal_before_discounts:num(get('Refund subtotal before discounts')),
    refund_of_seller_discounts:      num(get('Refund of seller discounts')),

    total_fees:                      num(get('Total Fees')),
    platform_commission_fee:         num(get('Platform commission fee')),
    pre_order_service_fee:           num(get('Pre-order service fee')),
    mall_service_fee:                num(get('Mall service fee')),
    payment_fee:                     num(get('Payment fee')),

    shipping_cost:                   num(get('Shipping cost')),
    shipping_cost_paid_by_customer:  num(get('Shipping cost paid by customer')),
    return_shipping_to_customer:     num(get('Return shipping to customer')),

    affiliate_commission:            num(get('Affiliate Commission')),
    affiliate_partner_commission:    num(get('Affiliate partner commission')),

    shipping_fee_program_service_fee: num(get('Shipping fee program service fee')),
    bonus_cashback_service_fee:      num(get('Bonus cashback service fee')),
    live_specials_service_fee:       num(get('Live specials service fee')),
    voucher_xtra_service_fee:        num(get('Voucher xtra service fee')),
    order_processing_fee:            num(get('Order processing fee')),
    eams_program_service_fee:        num(get('EAMS program service fee')),
    paylater_program_fee:            num(get('Paylater program fee')),
    article_22_income_tax_withheld:  num(get('Article 22 income tax withheld')),
    platform_special_service_fee:    num(get('Platform special service fee')),

    gmv_max_ad_fee:                  num(get('GMV Max ad fee')),
    gmv_max_coupon:                  num(get('GMV Max coupon')),

    adjustment_amount:               num(get('Adjustment amount')),
    related_order_id:                txt(get('Related order ID')),

    customer_payment:                num(get('Customer payment')),
    customer_refund:                 num(get('Customer refund')),
    seller_cofunded_voucher_discount: num(get('Seller cofunded voucher discount')),
    platform_discounts:              num(get('Platform discounts')),
    platform_cofunded_voucher_discounts: num(get('Platform cofunded voucher discounts')),

    order_source:                    txt(get('Order source')),

    raw_data:                        r,
  }
}

// ----------------------------------------------------------------------------
// TikTok Shop — All Orders (csv)
// ----------------------------------------------------------------------------
export function mapTiktokOrder(r: Row) {
  const get = (k: string) => r[k] ?? r[k + ' '] ?? r[k.trim()]
  return {
    order_id:                    txt(get('Order ID')),
    order_status:                txt(get('Order Status')),
    order_substatus:             txt(get('Order Substatus')),
    cancellation_return_type:    txt(get('Cancellation/Return Type')),
    normal_or_preorder:          txt(get('Normal or Pre-order')),

    sku_id:                      txt(get('SKU ID')),
    seller_sku:                  txt(get('Seller SKU')),
    product_name:                txt(get('Product Name')),
    variation:                   txt(get('Variation')),
    quantity:                    int(get('Quantity')),
    sku_quantity_of_return:      int(get('SKU Quantity of return')),

    sku_unit_original_price:     num(get('SKU Unit Original Price')),
    sku_subtotal_before_discount: num(get('SKU Subtotal Before Discount')),
    sku_platform_discount:       num(get('SKU Platform Discount')),
    sku_seller_discount:         num(get('SKU Seller Discount')),
    sku_subtotal_after_discount: num(get('SKU Subtotal After Discount')),
    shipping_fee_after_discount: num(get('Shipping Fee After Discount')),
    original_shipping_fee:       num(get('Original Shipping Fee')),
    order_amount:                num(get('Order Amount')),

    created_time:                parseDmyDateTime(get('Created Time')),
    paid_time:                   parseDmyDateTime(get('Paid Time')),
    shipped_time:                parseDmyDateTime(get('Shipped Time')),
    delivered_time:              parseDmyDateTime(get('Delivered Time')),
    cancelled_time:              parseDmyDateTime(get('Cancelled Time')),

    cancel_by:                   txt(get('Cancel By')),
    cancel_reason:               txt(get('Cancel Reason')),
    fulfillment_type:            txt(get('Fulfillment Type')),
    warehouse_name:              txt(get('Warehouse Name')),
    tracking_id:                 txt(get('Tracking ID')),
    shipping_provider_name:      txt(get('Shipping Provider Name')),

    buyer_username:              txt(get('Buyer Username')),
    payment_method:              txt(get('Payment Method')),
    weight_kg:                   num(get('Weight(kg)') ?? get('Weight (kg)')),
    purchase_channel:            txt(get('Purchase Channel')),
    tokopedia_invoice_number:    txt(get('Tokopedia Invoice Number')),

    raw_data:                    r,
  }
}

// ----------------------------------------------------------------------------
// TikTok Shop — Returns (csv)
// ----------------------------------------------------------------------------
export function mapTiktokReturn(r: Row) {
  const get = (k: string) => r[k] ?? r[k + ' '] ?? r[k.trim()]
  return {
    return_order_id:             txt(get('Return Order ID')),
    order_id:                    txt(get('Order ID')),
    order_amount:                num(get('Order Amount')),
    order_status:                txt(get('Order Status')),
    payment_method:              txt(get('Payment Method')),
    sku_id:                      txt(get('SKU ID')),
    seller_sku:                  txt(get('Seller SKU')),
    product_name:                txt(get('Product Name')),
    buyer_username:              txt(get('Buyer Username')),
    return_type:                 txt(get('Return Type')),
    time_requested:              parseDmyDateTime(get('Time Requested')),
    return_reason:               txt(get('Return Reason')),
    return_unit_price:           num(get('Return Unit Price')),
    return_quantity:             int(get('Return Quantity')),
    return_status:               txt(get('Return Status')),
    refund_time:                 parseDmyDateTime(get('Refund Time')),
    raw_data:                    r,
  }
}

// ----------------------------------------------------------------------------
// Generic dispatch by file_type_id
// ----------------------------------------------------------------------------
export function mapRowsForFileType(fileTypeId: string, rows: Row[]): Row[] {
  switch (fileTypeId) {
    case 'tiktok_income':    return rows.map(mapTiktokSettlement)
    case 'tiktok_orders':    return rows.map(mapTiktokOrder)
    case 'tiktok_returns':   return rows.map(mapTiktokReturn)
    case 'tiktok_affiliate': return rows.map(r => ({ ...r, raw_data: r }))
    case 'tiktok_ads':       return rows.map(r => ({ ...r, raw_data: r }))
    default:                 return rows.map(r => ({ raw_data: r }))
  }
}

// Detect period (min/max date) from a parsed batch by file_type_id.
export function detectPeriod(fileTypeId: string, rows: Row[]): { start: string | null, end: string | null } {
  const dates: string[] = []
  for (const r of rows) {
    if (fileTypeId === 'tiktok_income') {
      const d = (r as any).order_created_time
      if (d) dates.push(d)
    } else if (fileTypeId === 'tiktok_orders') {
      const d = (r as any).created_time
      if (d) dates.push(d.slice(0, 10))
    } else if (fileTypeId === 'tiktok_returns') {
      const d = (r as any).time_requested
      if (d) dates.push(d.slice(0, 10))
    }
  }
  if (dates.length === 0) return { start: null, end: null }
  dates.sort()
  return { start: dates[0], end: dates[dates.length - 1] }
}
