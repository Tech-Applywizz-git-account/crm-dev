-- ZOOM PHONE INTEGRATION SCHEMA
-- Run these commands in your Supabase SQL Editor

-- Table to track call requests and current status
CREATE TABLE IF NOT EXISTS zoom_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT UNIQUE, -- Zoom's unique call ID
    agent_id TEXT NOT NULL, -- Zoom User ID of the agent
    customer_phone TEXT NOT NULL,
    status TEXT DEFAULT 'initiated', -- initiated, ringing, answered, ended, failed
    direction TEXT DEFAULT 'outbound',
    duration INTEGER DEFAULT 0, -- in seconds
    recording_url TEXT,
    recording_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for audit trail of all webhook events
CREATE TABLE IF NOT EXISTS zoom_call_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_zoom_calls_call_id ON zoom_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_zoom_call_events_call_id ON zoom_call_events(call_id);
