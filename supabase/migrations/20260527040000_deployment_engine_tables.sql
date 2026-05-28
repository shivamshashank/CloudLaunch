-- Deployment engine state for queued apply/destroy work and generated artifacts.

CREATE TABLE IF NOT EXISTS public.deployment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('apply', 'destroy')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.deployment_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE NOT NULL,
    artifact_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.deployment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deployment jobs"
    ON public.deployment_jobs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.deployments
            WHERE public.deployments.id = public.deployment_jobs.deployment_id
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL)
        )
    );

CREATE POLICY "Users can create deployment jobs"
    ON public.deployment_jobs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deployments
            WHERE public.deployments.id = public.deployment_jobs.deployment_id
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL OR auth.uid() IS NULL)
        )
    );

CREATE POLICY "Backend can update deployment jobs"
    ON public.deployment_jobs FOR UPDATE
    USING (auth.uid() IS NULL OR EXISTS (
        SELECT 1 FROM public.deployments
        WHERE public.deployments.id = public.deployment_jobs.deployment_id
        AND public.deployments.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their own deployment artifacts"
    ON public.deployment_artifacts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.deployments
            WHERE public.deployments.id = public.deployment_artifacts.deployment_id
            AND (public.deployments.user_id = auth.uid() OR public.deployments.user_id IS NULL)
        )
    );

CREATE POLICY "Backend can create deployment artifacts"
    ON public.deployment_artifacts FOR INSERT
    WITH CHECK (
        auth.uid() IS NULL OR EXISTS (
            SELECT 1 FROM public.deployments
            WHERE public.deployments.id = public.deployment_artifacts.deployment_id
            AND public.deployments.user_id = auth.uid()
        )
    );

BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deployment_jobs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deployment_artifacts;
COMMIT;
