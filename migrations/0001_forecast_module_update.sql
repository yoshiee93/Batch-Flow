-- Migration: Forecast module update
-- Adds confidenceLevel and convertedAt columns, replaces forecast_status enum
-- with new values: Draft, Likely, Confirmed Forecast, Converted, Cancelled

-- Add new columns
ALTER TABLE forecast_orders 
  ADD COLUMN IF NOT EXISTS confidence_level text,
  ADD COLUMN IF NOT EXISTS converted_at timestamp;

-- Migrate the forecast_status enum to new values
CREATE TYPE forecast_status_new AS ENUM ('Draft', 'Likely', 'Confirmed Forecast', 'Converted', 'Cancelled');

ALTER TABLE forecast_orders 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE forecast_orders 
  ALTER COLUMN status TYPE forecast_status_new 
  USING CASE 
    WHEN status::text = 'open' THEN 'Draft'::forecast_status_new
    WHEN status::text = 'converted' THEN 'Converted'::forecast_status_new
    WHEN status::text = 'archived' THEN 'Cancelled'::forecast_status_new
    ELSE 'Draft'::forecast_status_new
  END;

ALTER TABLE forecast_orders 
  ALTER COLUMN status SET DEFAULT 'Draft'::forecast_status_new;

DROP TYPE forecast_status;

ALTER TYPE forecast_status_new RENAME TO forecast_status;
