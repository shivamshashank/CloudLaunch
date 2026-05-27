-- Create deployments table
CREATE TABLE IF NOT EXISTS public.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    instance_type TEXT NOT NULL,
    iam_policy TEXT NOT NULL,
    vpc_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    security_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    storage_gb INTEGER NOT NULL DEFAULT 20,
    monitoring BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending',
    cost_estimate_monthly NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create deployment_logs table
CREATE TABLE IF NOT EXISTS public.deployment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE NOT NULL,
    level TEXT NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create deployment_costs table
CREATE TABLE IF NOT EXISTS public.deployment_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE NOT NULL,
    resource_name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    hourly_cost NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    monthly_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for deployments
CREATE POLICY "Users can create their own deployments" 
    ON public.deployments FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own deployments" 
    ON public.deployments FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own deployments" 
    ON public.deployments FOR UPDATE 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own deployments" 
    ON public.deployments FOR DELETE 
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Create policies for deployment_logs
CREATE POLICY "Users can view logs of their own deployments" 
    ON public.deployment_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.deployments 
            WHERE public.deployments.id = public.deployment_logs.deployment_id 
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert logs for their own deployments" 
    ON public.deployment_logs FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deployments 
            WHERE public.deployments.id = public.deployment_logs.deployment_id 
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL)
        )
    );

-- Create policies for deployment_costs
CREATE POLICY "Users can view costs of their own deployments" 
    ON public.deployment_costs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.deployments 
            WHERE public.deployments.id = public.deployment_costs.deployment_id 
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert costs for their own deployments" 
    ON public.deployment_costs FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deployments 
            WHERE public.deployments.id = public.deployment_costs.deployment_id 
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL)
        )
    );

-- Enable Realtime publication for tables
BEGIN;
  -- Drop existing publications if any, but usually we just add tosupabase_realtime
  -- Check if publication exists first, if not we will just add tables.
  -- Supabase manages the `supabase_realtime` publication, so we can just alter it.
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deployments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deployment_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deployment_costs;
COMMIT;
