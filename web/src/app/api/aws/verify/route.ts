import { NextResponse } from "next/server";
import { AssumeRoleCommand, GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId, awsAccountId, awsRoleArn, externalId } = await request.json();

    if (!userId || !awsAccountId || !awsRoleArn) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: userId, awsAccountId, or awsRoleArn." },
        { status: 400 },
      );
    }

    const accountIdRegex = /^\d{12}$/;
    if (!accountIdRegex.test(awsAccountId)) {
      return NextResponse.json({ success: false, error: "AWS Account ID must be a 12-digit number." }, { status: 400 });
    }

    const roleArnRegex = /^arn:aws:iam::\d{12}:role\/[a-zA-Z0-9+=,.@\-_\/]+$/;
    if (!roleArnRegex.test(awsRoleArn)) {
      return NextResponse.json(
        { success: false, error: "IAM Role ARN must follow the format arn:aws:iam::[Account-ID]:role/[Role-Name]." },
        { status: 400 },
      );
    }

    const arnMatch = awsRoleArn.match(/::(\d{12}):/);
    if (arnMatch?.[1] !== awsAccountId) {
      return NextResponse.json(
        { success: false, error: "The Account ID specified in the IAM Role ARN does not match your AWS Account ID." },
        { status: 400 },
      );
    }

    const stsClient = new STSClient({});
    const assumeResponse = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: awsRoleArn,
        RoleSessionName: `CloudLaunchVerify-${userId.slice(0, 8)}`,
        ExternalId: externalId || undefined,
        DurationSeconds: 900,
      }),
    );

    if (!assumeResponse.Credentials?.AccessKeyId || !assumeResponse.Credentials.SecretAccessKey) {
      throw new Error("AWS STS did not return temporary credentials.");
    }

    const targetSts = new STSClient({
      credentials: {
        accessKeyId: assumeResponse.Credentials.AccessKeyId,
        secretAccessKey: assumeResponse.Credentials.SecretAccessKey,
        sessionToken: assumeResponse.Credentials.SessionToken,
      },
    });
    const identity = await targetSts.send(new GetCallerIdentityCommand({}));

    const logs = [
      { level: "INFO", message: "[STS] Starting cross-account AssumeRole verification against the submitted customer role." },
      { level: "INFO", message: `[STS] Target role: ${awsRoleArn}` },
      { level: "INFO", message: `[STS] ExternalId: ${externalId || "not provided"}` },
      { level: "SUCCESS", message: "[STS] Temporary role credentials issued by AWS." },
      { level: "SUCCESS", message: `[STS] Connected AWS identity: ${identity.Arn} in account ${identity.Account}.` },
      { level: "SUCCESS", message: "AWS integration verified. CloudLaunch can deploy into this account with the configured role." },
    ];

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AWS verification error.";
    return NextResponse.json({ success: false, error: `AWS trust verification failed: ${message}` }, { status: 500 });
  }
}
