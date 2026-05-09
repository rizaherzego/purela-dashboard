-- Add RSP and bottom price to products. Pricing is needed for the SKU master
-- upload flow (loaded from the Excel's RSP and BOTTOM PRICE columns; bundles
-- get RSP from the "Mark Up" column and bottom_price from "Bottom Price").
-- Sales analytics don't require these (revenue comes from the sales feed) but
-- they enable below-floor-price flagging and RSP comparisons.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS rsp_price    NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS bottom_price NUMERIC(15,2);
