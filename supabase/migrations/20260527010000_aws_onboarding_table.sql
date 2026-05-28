-- Create user_aws_configs table
CREATE TABLE IF NOT EXISTS public.user_aws_configs (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    aws_account_id TEXT NOT NULL,
    aws_role_arn TEXT NOT NULL,
    external_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_aws_configs ENABLE ROW LEVEL SECURITY;

-- Set up policies for user_aws_configs
CREATE POLICY "Users can manage their own AWS configs"
    ON public.user_aws_configs FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Enable Realtime publication for the table
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_aws_configs;
COMMIT;
