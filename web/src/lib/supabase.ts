import { createClient } from "@supabase/supabase-js";

// Define TypeScript interfaces for our database objects
export interface Deployment {
  id: string;
  user_id?: string;
  name: string;
  region: string;
  instance_type: string;
  iam_policy: string;
  vpc_config: {
    cidr: string;
    public_subnets: number;
    private_subnets: number;
  };
  security_groups: Array<{
    port: number;
    protocol: string;
    source: string;
  }>;
  storage_gb: number;
  monitoring: boolean;
  status: "pending" | "planning" | "planned" | "applying" | "deployed" | "destroying" | "destroyed" | "failed";
  cost_estimate_monthly: number;
  created_at: string;
  updated_at: string;
}

export interface DeploymentLog {
  id: string;
  deployment_id: string;
  level: "INFO" | "WARN" | "SUCCESS" | "ERROR";
  message: string;
  timestamp: string;
}

export interface DeploymentCost {
  id: string;
  deployment_id: string;
  resource_name: string;
  resource_type: string;
  hourly_cost: number;
  monthly_cost: number;
  currency: string;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️ WARNING: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in your env variables. Please add them to .env.local for live connections."
  );
}

// Directly export the official un-mocked Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
