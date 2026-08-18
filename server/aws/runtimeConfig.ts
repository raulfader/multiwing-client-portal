import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

type SecretValues = Record<string, unknown>;

type RdsEndpointFallback = {
  host?: string;
  port?: string;
  database?: string;
};

const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
let hydration: Promise<void> | undefined;

function parseSecret(value: string): SecretValues {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("must be a JSON object");
    }
    return parsed as SecretValues;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new Error(`AWS secret must contain a JSON object: ${detail}`);
  }
}

/** Builds a MySQL URL from an RDS managed secret plus stack-provided endpoint data. */
export function createDatabaseUrlFromRdsSecret(
  credentials: SecretValues,
  fallback: RdsEndpointFallback = {}
): string {
  const username = credentials.username;
  const password = credentials.password;
  const host = credentials.host ?? fallback.host;
  const port = credentials.port ?? fallback.port ?? "3306";
  const database =
    credentials.dbname ?? fallback.database ?? process.env.RDS_DATABASE_NAME;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof host !== "string" ||
    !host.trim() ||
    typeof database !== "string" ||
    !database.trim()
  ) {
    throw new Error("RDS master secret and endpoint configuration are incomplete");
  }

  const normalizedPort = String(port).trim();
  if (!/^\d{1,5}$/.test(normalizedPort)) {
    throw new Error("RDS endpoint port is invalid");
  }

  return `mysql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host.trim()}:${normalizedPort}/${encodeURIComponent(database.trim())}`;
}

/** Hydrates the duplicate-runtime configuration once per Lambda process. */
export async function hydrateRuntimeConfig(): Promise<void> {
  if (hydration) return hydration;

  hydration = (async () => {
    const applicationSecretArn = process.env.APP_SECRET_ARN;
    if (!applicationSecretArn) return;

    const client = new SecretsManagerClient({ region: AWS_REGION });
    const applicationSecret = await client.send(
      new GetSecretValueCommand({ SecretId: applicationSecretArn })
    );
    if (!applicationSecret.SecretString) {
      throw new Error("AWS application secret is empty");
    }

    for (const [key, value] of Object.entries(
      parseSecret(applicationSecret.SecretString)
    )) {
      if (typeof value === "string" && value.length > 0) {
        process.env[key] = value;
      }
    }

    if (!process.env.DATABASE_URL && process.env.RDS_MASTER_SECRET_ARN) {
      const rdsSecret = await client.send(
        new GetSecretValueCommand({
          SecretId: process.env.RDS_MASTER_SECRET_ARN,
        })
      );
      if (!rdsSecret.SecretString) {
        throw new Error("RDS master secret is empty");
      }
      process.env.DATABASE_URL = createDatabaseUrlFromRdsSecret(
        parseSecret(rdsSecret.SecretString),
        { host: process.env.RDS_HOST, port: process.env.RDS_PORT }
      );
    }
  })();

  return hydration;
}
