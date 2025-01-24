import * as dotenv from "dotenv";
import { z } from "zod";
import fs from "node:fs";
import path from "path";

const booleanFromEnv = z.string().transform((val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    throw new Error(`Invalid boolean value: ${val}`);
});

/**
 * @description Define the schema for the environment variables.
 */
const envSchema = z.object({
    /**
     * @description Basic environment variables
     */
    /**
     * The environment to run the server in.
     */
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    /**
     * The port to run the server on.
     */
    PORT: z.string().regex(/^\d+$/).transform(Number).default("3000"),
    /**
     * The URL of the database to connect to.
     */
    DATABASE_URL: z.string().url(),
    /**
     * The URL of the Redis server to connect to.
     */
    REDIS_URL: z.string().url(),
    /**
     * The time in seconds to cache data in Redis.
     */
    REDIS_CACHE_TIME: z.string().regex(/^\d+$/).transform(Number).default("604800"),
    /**
     * Whether to enable debug mode.
     */
    DEBUG: booleanFromEnv.optional().default("false"),

    /**
     * @description Optional, additional environment variables
     */
    /**
     * Whether to use Mixdrop for fetching videos.
     */
    USE_MIXDROP: booleanFromEnv.optional().default("false"),
    /**
     * Mixdrop email for fetching videos.
     */
    MIXDROP_EMAIL: z.string().optional(),
    /**
     * Mixdrop key for fetching videos.
     */
    MIXDROP_KEY: z.string().optional(),

    /**
     * @description Enviorment variables for mapping providers.
     */
    NOVELUPDATES_LOGIN: z.string().optional(),
});

/**
 * @description Set the file path for the `.env` file.
 */
const ENV_FILE_PATH = path.resolve(process.cwd(), ".env");

/**
 * @description Load and parse the `.env` file
 */
dotenv.config({ path: ENV_FILE_PATH });

/**
 * @description Preprocess environment variables to remove semicolons.
 */
const cleanEnvironmentVariables = (env: NodeJS.ProcessEnv) => {
    const cleanedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
        if (value) {
            let cleaned = value.trim();

            // Remove trailing semicolon
            cleaned = cleaned.replace(/;$/, "");

            // If the entire string is wrapped in quotes (""), remove them
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                cleaned = cleaned.slice(1, -1);
            }

            cleanedEnv[key] = cleaned;
        }
    }
    return cleanedEnv;
};

const cleanedEnv = cleanEnvironmentVariables(process.env);

/**
 * @description Generate a default `.env` file if missing
 */
const generateEnvFile = () => {
    if (!fs.existsSync(ENV_FILE_PATH)) {
        const defaultValues = Object.entries(envSchema.shape).map(([key, schema]) => {
            const defaultValue = schema instanceof z.ZodDefault ? schema._def.defaultValue() : undefined;
            return `${key}=${defaultValue ?? ""}`;
        });
        fs.writeFileSync(ENV_FILE_PATH, defaultValues.join("\n"));
        console.log(`Generated default .env file at ${ENV_FILE_PATH}`);
    }
};

generateEnvFile();

/**
 * @description Validate and parse environment variables.
 */
const parsedEnv = envSchema.safeParse(cleanedEnv);

if (!parsedEnv.success) {
    console.error("Invalid environment variables:", parsedEnv.error.format());
    process.exit(1);
}

/**
 * @description Extract validated variables.
 */
const env = parsedEnv.data;
export { env };
