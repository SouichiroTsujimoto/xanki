ALTER TABLE entitlements ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE entitlements ADD COLUMN stripe_subscription_id TEXT;
CREATE INDEX IF NOT EXISTS idx_entitlements_stripe_customer ON entitlements (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_stripe_subscription ON entitlements (stripe_subscription_id);
