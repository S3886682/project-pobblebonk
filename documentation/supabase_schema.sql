CREATE TABLE observations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    species TEXT NOT NULL,
    confidence FLOAT4 NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    location JSONB
);
