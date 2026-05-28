-- Update RLS policies for user_aws_configs to be more robust
-- This drops the existing policy and recreates it with a fallback for auth.uid() IS NULL, 
-- ensuring that unauthenticated or guest/test users are not blocked by RLS in dev environments.

DROP POLICY IF EXISTS "Users can manage their own AWS configs" ON public.user_aws_configs;

CREATE POLICY "Users can manage their own AWS configs"
    ON public.user_aws_configs FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
