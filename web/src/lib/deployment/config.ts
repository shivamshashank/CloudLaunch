export interface SecurityGroupRule {
  port: number;
  protocol: string;
  source: string;
}

export interface DeploymentConfig {
  name: string;
  region: string;
  instance_type: string;
  iam_policy: string;
  vpc_cidr: string;
  public_subnets: number;
  private_subnets: number;
  storage_gb: number;
  volume_type: string;
  monitoring: boolean;
  gitops_sync: boolean;
  network_isolation: boolean;
  security_groups: SecurityGroupRule[];
}

export const SUPPORTED_REGIONAL_AMIS: Record<string, string> = {
  "us-east-1": "ami-0c7217cdde317cfec",
  "us-west-2": "ami-0387d7b28699c6d40",
  "eu-west-1": "ami-0d940f23d527c30f1",
  "ap-southeast-1": "ami-0e1011855a8f4c204",
};

export function normalizeDeploymentConfig(config: Partial<DeploymentConfig>): DeploymentConfig {
  const configuredRules = config.security_groups?.length
    ? config.security_groups
    : [{ port: 22, protocol: "tcp", source: "0.0.0.0/0" }];
  const requiredMonitoringRules = config.monitoring === false
    ? []
    : [
        { port: 3000, protocol: "tcp", source: "0.0.0.0/0" },
        { port: 9090, protocol: "tcp", source: "0.0.0.0/0" },
        { port: 3100, protocol: "tcp", source: "0.0.0.0/0" },
        { port: 9100, protocol: "tcp", source: "0.0.0.0/0" },
      ];
  const rulesByKey = new Map<string, SecurityGroupRule>();
  [...configuredRules, ...requiredMonitoringRules].forEach((rule) => {
    rulesByKey.set(`${rule.protocol}:${rule.port}:${rule.source}`, rule);
  });

  return {
    name: config.name || "CloudLaunch Observability Stack",
    region: config.region || "us-east-1",
    instance_type: config.instance_type || "t3.medium",
    iam_policy: config.iam_policy || "PowerUserAccess",
    vpc_cidr: config.vpc_cidr || "10.0.0.0/16",
    public_subnets: config.public_subnets || 2,
    private_subnets: config.private_subnets || 2,
    storage_gb: config.storage_gb || 40,
    volume_type: config.volume_type || "gp3",
    monitoring: config.monitoring ?? true,
    gitops_sync: config.gitops_sync ?? false,
    network_isolation: config.network_isolation ?? false,
    security_groups: Array.from(rulesByKey.values()),
  };
}
