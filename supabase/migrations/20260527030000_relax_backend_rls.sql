-- Relax RLS policies for deployments and related logs/costs 
-- to allow backend API routes (which execute anonymously, having auth.uid() IS NULL) 
-- to write logs and update deployment status without RLS violations.

-- 1. Update deployments FOR UPDATE policy
DROP POLICY IF EXISTS "Users can update their own deployments" ON public.deployments;
CREATE POLICY "Users can update their own deployments" 
    ON public.deployments FOR UPDATE 
    USING (auth.uid() = user_id OR user_id IS NULL OR auth.uid() IS NULL);

-- 2. Update deployment_logs FOR INSERT policy
DROP POLICY IF EXISTS "Users can insert logs for their own deployments" ON public.deployment_logs;
CREATE POLICY "Users can insert logs for their own deployments" 
    ON public.deployment_logs FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deployments 
            WHERE public.deployments.id = public.deployment_logs.deployment_id 
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL OR auth.uid() IS NULL)
        )
    );

-- 3. Update deployment_costs FOR INSERT policy
DROP POLICY IF EXISTS "Users can insert costs for their own deployments" ON public.deployment_costs;
CREATE POLICY "Users can insert costs for their own deployments" 
    ON public.deployment_costs FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deployments 
            WHERE public.deployments.id = public.deployment_costs.deployment_id 
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL OR auth.uid() IS NULL)
        )
    );
