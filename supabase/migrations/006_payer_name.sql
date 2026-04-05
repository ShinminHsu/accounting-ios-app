-- Add payer_name column to transactions for free-text payer entry
-- when no saved contact is selected (代付對象 free-text fallback)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payer_name TEXT;

-- Add payer_name to debt_records so the tracker can show the free-text name
ALTER TABLE debt_records ADD COLUMN IF NOT EXISTS payer_name TEXT;
