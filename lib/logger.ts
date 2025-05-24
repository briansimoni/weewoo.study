import winston from "winston";
import WinstonCloudWatch from "winston-cloudwatch";

function isRunningInDenoDeploy(): boolean {
  // Deno Deploy sets this environment variable
  return !!Deno.env.get("DENO_DEPLOYMENT_ID");
}

function getHostname(): string {
  try {
    return Deno.hostname();
  } catch {
    return "unknown-host";
  }
}

/**
 * Get the correct CloudWatch log group based on environment
 */
function getLogGroupName(): string {
  const env = Deno.env.get("STAGE") || "development";
  if (env === "PROD") {
    return "/weewoo-study/production";
  } else if (env === "TEST") {
    return "/weewoo-study/test";
  }
  return "";
}

// Configure format for JSON logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Configure format for console logging (more readable for local development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
    }`;
  }),
);

// Create base logger with console transport
const logger = winston.createLogger({
  level: Deno.env.get("LOG_LEVEL") || "debug",
  format: isRunningInDenoDeploy() ? jsonFormat : consoleFormat,
  transports: [
    new winston.transports.Console({}),
  ],
});

// Add CloudWatch transport if running in Deno Deploy
if (isRunningInDenoDeploy()) {
  try {
    const cloudWatchConfig = {
      logGroupName: getLogGroupName(),
      logStreamName: `${getHostname()}-${
        new Date().toISOString().split("T")[0]
      }`,
      awsRegion: Deno.env.get("AWS_REGION") || "us-east-1",
      messageFormatter: (
        { level, message, ...meta }: {
          level: string;
          message: string;
          [key: string]: unknown;
        },
      ) => {
        return JSON.stringify({
          level,
          message,
          ...meta,
          timestamp: new Date().toISOString(),
        });
      },
      awsOptions: {
        credentials: {
          accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
          secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
        },
      },
    };

    // Add CloudWatch transport to the logger
    logger.add(new WinstonCloudWatch(cloudWatchConfig));
    logger.info("CloudWatch logging initialized");
  } catch (err) {
    console.error("Failed to initialize CloudWatch logging:", err);
  }
}

// Create a typed interface for the logger
export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// Export the logger with type safety
export const log: Logger = {
  debug: (message, meta = {}) => logger.debug(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
};

// Log startup information with deployment context
log.info(`Logger initialized for weewoo.study`, {
  deploymentId: Deno.env.get("DENO_DEPLOYMENT_ID") || "local",
  cloudWatchEnabled: isRunningInDenoDeploy(),
});
