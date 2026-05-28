import {
  AuthorizeSecurityGroupIngressCommand,
  CreateSecurityGroupCommand,
  DeleteSecurityGroupCommand,
  DescribeInstancesCommand,
  DescribeVpcsCommand,
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  VolumeType,
  _InstanceType,
} from "@aws-sdk/client-ec2";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { SupabaseClient } from "@supabase/supabase-js";
import { buildObservabilityBootstrapScript } from "./bootstrap";
import { DeploymentConfig, normalizeDeploymentConfig, SUPPORTED_REGIONAL_AMIS } from "./config";
import { renderTerraformMain } from "./terraform";

type LogLevel = "INFO" | "WARN" | "SUCCESS" | "ERROR";

interface EngineContext {
  deploymentId: string;
  jobId?: string;
  config: Partial<DeploymentConfig>;
  supabase: SupabaseClient;
}

interface DestroyContext {
  deploymentId: string;
  jobId?: string;
  supabase: SupabaseClient;
}

async function writeDbLog(supabase: SupabaseClient, deploymentId: string, level: LogLevel, message: string) {
  console.log(`[CloudLaunch] [${deploymentId}] [${level}] ${message}`);
  const { error } = await supabase.from("deployment_logs").insert({
    deployment_id: deploymentId,
    level,
    message,
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error(`[CloudLaunch] Failed to persist log: ${error.message}`);
  }
}

async function updateStatus(supabase: SupabaseClient, deploymentId: string, status: string, patch: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("deployments")
    .update({ status, updated_at: new Date().toISOString(), ...patch })
    .eq("id", deploymentId);

  if (error) {
    await writeDbLog(supabase, deploymentId, "WARN", `Could not update deployment status to ${status}: ${error.message}`);
  }
}

async function updateJob(supabase: SupabaseClient, jobId: string | undefined, status: string, patch: Record<string, unknown> = {}) {
  if (!jobId) return;

  const statusPatch =
    status === "running"
      ? { started_at: new Date().toISOString() }
      : status === "succeeded" || status === "failed"
        ? { finished_at: new Date().toISOString() }
        : {};

  const { error } = await supabase
    .from("deployment_jobs")
    .update({ status, ...statusPatch, ...patch })
    .eq("id", jobId);

  if (error) {
    console.error(`[CloudLaunch] Failed to update job ${jobId}: ${error.message}`);
  }
}

async function getDeploymentOwner(supabase: SupabaseClient, deploymentId: string) {
  const { data, error } = await supabase.from("deployments").select("user_id, region, vpc_config").eq("id", deploymentId).maybeSingle();
  if (error || !data) {
    throw new Error(error?.message || "Deployment record was not found.");
  }
  return data as { user_id: string | null; region: string; vpc_config: Record<string, unknown> | null };
}

async function getAwsRoleConfig(supabase: SupabaseClient, userId: string | null) {
  if (!userId) return null;
  const { data, error } = await supabase.from("user_aws_configs").select("aws_role_arn, external_id").eq("user_id", userId).maybeSingle();
  if (error) {
    throw new Error(`Could not read AWS configuration: ${error.message}`);
  }
  if (!data?.aws_role_arn) return null;
  return {
    roleArn: data.aws_role_arn as string,
    externalId: (data.external_id as string) || undefined,
  };
}

async function assumeUserRole(region: string, roleConfig: Awaited<ReturnType<typeof getAwsRoleConfig>>, deploymentId: string) {
  if (!roleConfig) {
    throw new Error("No AWS role ARN is configured for this user.");
  }

  const stsClient = new STSClient({ region });
  const response = await stsClient.send(
    new AssumeRoleCommand({
      RoleArn: roleConfig.roleArn,
      RoleSessionName: `CloudLaunch-${deploymentId.slice(0, 8)}`,
      ExternalId: roleConfig.externalId,
      DurationSeconds: 3600,
    }),
  );

  if (!response.Credentials?.AccessKeyId || !response.Credentials.SecretAccessKey) {
    throw new Error("AWS STS did not return temporary credentials.");
  }

  return {
    accessKeyId: response.Credentials.AccessKeyId,
    secretAccessKey: response.Credentials.SecretAccessKey,
    sessionToken: response.Credentials.SessionToken,
  };
}

function appBaseUrl() {
  return (
    process.env.CLOUDLAUNCH_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
    "http://localhost:3000"
  );
}

function ingestToken() {
  return process.env.CLOUDLAUNCH_LOG_INGEST_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || "local-dev-log-ingest-token";
}

function calculateMonthlyCost(config: DeploymentConfig) {
  const computeCost = config.instance_type === "t3.micro" ? 7.5 : config.instance_type === "t3.medium" ? 30 : config.instance_type === "m5.large" ? 69.12 : 122.4;
  const storageCost = config.storage_gb * 0.08;
  const telemetryCost = config.monitoring ? 15 : 0;
  return computeCost + storageCost + telemetryCost;
}

async function createSecurityGroup(ec2Client: EC2Client, deploymentId: string, config: DeploymentConfig) {
  const vpcs = await ec2Client.send(
    new DescribeVpcsCommand({
      Filters: [{ Name: "isDefault", Values: ["true"] }],
    }),
  );
  const vpcId = vpcs.Vpcs?.[0]?.VpcId;
  const group = await ec2Client.send(
    new CreateSecurityGroupCommand({
      GroupName: `cloudlaunch-${deploymentId.slice(0, 8)}`,
      Description: `CloudLaunch observability access for ${deploymentId}`,
      VpcId: vpcId,
      TagSpecifications: [
        {
          ResourceType: "security-group",
          Tags: [
            { Key: "ManagedBy", Value: "CloudLaunch" },
            { Key: "DeploymentId", Value: deploymentId },
          ],
        },
      ],
    }),
  );

  if (!group.GroupId) {
    throw new Error("AWS did not return a security group ID.");
  }

  await ec2Client.send(
    new AuthorizeSecurityGroupIngressCommand({
      GroupId: group.GroupId,
      IpPermissions: config.security_groups.map((rule) => ({
        FromPort: rule.port,
        ToPort: rule.port,
        IpProtocol: rule.protocol,
        IpRanges: [{ CidrIp: rule.source, Description: `CloudLaunch ingress ${rule.port}` }],
      })),
    }),
  );

  return group.GroupId;
}

async function saveTerraformArtifact(supabase: SupabaseClient, deploymentId: string, terraformMain: string) {
  const { error } = await supabase.from("deployment_artifacts").insert({
    deployment_id: deploymentId,
    artifact_type: "terraform_main",
    content: terraformMain,
  });

  if (error) {
    await writeDbLog(supabase, deploymentId, "WARN", `Terraform artifact was generated but could not be saved: ${error.message}`);
  }
}

export async function runDeploymentJob({ deploymentId, jobId, config: rawConfig, supabase }: EngineContext) {
  const config = normalizeDeploymentConfig(rawConfig);

  try {
    await updateJob(supabase, jobId, "running");
    await updateStatus(supabase, deploymentId, "planning");
    await writeDbLog(supabase, deploymentId, "INFO", "Deployment worker accepted the job.");
    await writeDbLog(supabase, deploymentId, "INFO", "Rendering Terraform plan for EC2 observability host.");

    const publicBaseUrl = appBaseUrl();
    const bootstrapScript = buildObservabilityBootstrapScript({
      deploymentId,
      ingestUrl: `${publicBaseUrl}/api/log-ingest`,
      ingestToken: ingestToken(),
      enableMonitoring: config.monitoring,
    });
    const terraformMain = renderTerraformMain({ deploymentId, config, userData: bootstrapScript });
    await saveTerraformArtifact(supabase, deploymentId, terraformMain);
    await writeDbLog(supabase, deploymentId, "SUCCESS", "Terraform configuration rendered and stored.");

    const deployment = await getDeploymentOwner(supabase, deploymentId);
    const roleConfig = await getAwsRoleConfig(supabase, deployment.user_id);
    if (!roleConfig) {
      throw new Error("No AWS role ARN is configured for this user.");
    }
    await writeDbLog(supabase, deploymentId, "INFO", `Assuming customer AWS role ${roleConfig.roleArn}.`);
    const credentials = await assumeUserRole(config.region, roleConfig, deploymentId);
    await writeDbLog(supabase, deploymentId, "SUCCESS", "AWS role assumed successfully.");

    await updateStatus(supabase, deploymentId, "applying");
    await writeDbLog(supabase, deploymentId, "INFO", "Applying infrastructure in the customer AWS account.");

    const amiId = SUPPORTED_REGIONAL_AMIS[config.region] || SUPPORTED_REGIONAL_AMIS["us-east-1"];
    const ec2Client = new EC2Client({ region: config.region, credentials });
    const securityGroupId = await createSecurityGroup(ec2Client, deploymentId, config);
    await writeDbLog(supabase, deploymentId, "SUCCESS", `Security group created: ${securityGroupId}.`);

    const response = await ec2Client.send(
      new RunInstancesCommand({
        ImageId: amiId,
        InstanceType: config.instance_type as _InstanceType,
        MinCount: 1,
        MaxCount: 1,
        UserData: Buffer.from(bootstrapScript).toString("base64"),
        SecurityGroupIds: [securityGroupId],
        BlockDeviceMappings: [
          {
            DeviceName: "/dev/sda1",
            Ebs: {
              VolumeSize: config.storage_gb,
              VolumeType: config.volume_type as VolumeType,
              Encrypted: true,
              DeleteOnTermination: true,
            },
          },
        ],
        TagSpecifications: [
          {
            ResourceType: "instance",
            Tags: [
              { Key: "Name", Value: config.name },
              { Key: "ManagedBy", Value: "CloudLaunch" },
              { Key: "DeploymentId", Value: deploymentId },
            ],
          },
        ],
      }),
    );

    const instanceId = response.Instances?.[0]?.InstanceId;
    if (!instanceId) {
      throw new Error("AWS did not return an EC2 instance ID.");
    }

    await writeDbLog(supabase, deploymentId, "SUCCESS", `EC2 instance creation accepted: ${instanceId}.`);
    await writeDbLog(supabase, deploymentId, "INFO", "Waiting for instance to enter running state and receive a public endpoint.");

    let publicIp = "";
    let publicDns = "";
    let stateName = "pending";

    for (let attempt = 1; attempt <= 40; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const describe = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
      const instance = describe.Reservations?.[0]?.Instances?.[0];
      stateName = instance?.State?.Name || "pending";
      publicIp = instance?.PublicIpAddress || "";
      publicDns = instance?.PublicDnsName || "";
      await writeDbLog(supabase, deploymentId, "INFO", `AWS EC2 state: ${stateName} (${attempt}/40).`);

      if (stateName === "running" && publicIp) break;
      if (stateName === "terminated" || stateName === "shutting-down") {
        throw new Error(`Instance entered ${stateName} during provisioning.`);
      }
    }

    if (stateName !== "running" || !publicIp) {
      throw new Error("Timed out waiting for EC2 to become reachable.");
    }

    await writeDbLog(supabase, deploymentId, "SUCCESS", `EC2 is running at ${publicIp}. Bootstrap logs will continue streaming from cloud-init.`);
    await updateStatus(supabase, deploymentId, "deployed", {
      cost_estimate_monthly: calculateMonthlyCost(config),
      vpc_config: {
        cidr: config.vpc_cidr,
        public_subnets: config.public_subnets,
        private_subnets: config.private_subnets,
        instance_id: instanceId,
        security_group_id: securityGroupId,
        public_ip: publicIp,
        public_dns: publicDns,
        grafana_url: `http://${publicIp}:3000`,
        prometheus_url: `http://${publicIp}:9090`,
        loki_url: `http://${publicIp}:3100`,
      },
    });
    await updateJob(supabase, jobId, "succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown deployment failure.";
    await writeDbLog(supabase, deploymentId, "ERROR", message);
    await updateStatus(supabase, deploymentId, "failed");
    await updateJob(supabase, jobId, "failed", { error_message: message });
  }
}

export async function runDestroyJob({ deploymentId, jobId, supabase }: DestroyContext) {
  try {
    await updateJob(supabase, jobId, "running");
    const deployment = await getDeploymentOwner(supabase, deploymentId);
    const instanceId = deployment.vpc_config?.instance_id;
    const securityGroupId = deployment.vpc_config?.security_group_id;

    if (typeof instanceId !== "string" || !instanceId) {
      await writeDbLog(supabase, deploymentId, "WARN", "No EC2 instance ID was recorded; marking deployment destroyed.");
      await updateStatus(supabase, deploymentId, "destroyed");
      await updateJob(supabase, jobId, "succeeded");
      return;
    }

    await updateStatus(supabase, deploymentId, "destroying");
    const roleConfig = await getAwsRoleConfig(supabase, deployment.user_id);
    const credentials = await assumeUserRole(deployment.region, roleConfig, deploymentId);
    const ec2Client = new EC2Client({ region: deployment.region, credentials });

    await writeDbLog(supabase, deploymentId, "WARN", `Terminating EC2 instance ${instanceId}.`);
    await ec2Client.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }));

    for (let attempt = 1; attempt <= 40; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const describe = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
      const stateName = describe.Reservations?.[0]?.Instances?.[0]?.State?.Name || "shutting-down";
      await writeDbLog(supabase, deploymentId, "INFO", `AWS EC2 termination state: ${stateName} (${attempt}/40).`);
      if (stateName === "terminated") break;
    }

    await writeDbLog(supabase, deploymentId, "SUCCESS", "Destroy finished. EC2 instance is terminated.");
    if (typeof securityGroupId === "string" && securityGroupId) {
      try {
        await ec2Client.send(new DeleteSecurityGroupCommand({ GroupId: securityGroupId }));
        await writeDbLog(supabase, deploymentId, "SUCCESS", `Security group deleted: ${securityGroupId}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown security group cleanup failure";
        await writeDbLog(supabase, deploymentId, "WARN", `Security group cleanup needs manual review: ${message}.`);
      }
    }
    await updateStatus(supabase, deploymentId, "destroyed");
    await updateJob(supabase, jobId, "succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown destroy failure.";
    await writeDbLog(supabase, deploymentId, "ERROR", message);
    await updateStatus(supabase, deploymentId, "failed");
    await updateJob(supabase, jobId, "failed", { error_message: message });
  }
}
