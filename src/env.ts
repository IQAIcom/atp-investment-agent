import { config } from "dotenv";
import { z } from "zod";

config();

export const envSchema = z.object({
	PATH: z.string(),
	DEBUG: z.string().default("false"),
	IQ_ADDRESS: z.string().default("0x6EFB84bda519726Fa1c65558e520B92b51712101"),
	WALLET_PRIVATE_KEY: z.string().min(5, "Wallet private key is required"),
	ATP_API_URL: z.string().optional(),
	ATP_AGENT_ROUTER_ADDRESS: z.string().optional(),
	LLM_MODEL: z.string().default("gemini-2.0-flash"),
	OPEN_ROUTER_KEY: z
		.string()
		.optional()
		.describe("When given, agents use open-router endpoint instead"),
	TELEGRAM_CHAT_ID: z.string(),
	TELEGRAM_BOT_TOKEN: z.string(),
	ATP_INVESTMENT_PERCENTAGE: z
		.string()
		.transform((val) => Number.parseFloat(val))
		.default("0.1"),
	ATP_MIN_INVESTMENT: z
		.string()
		.transform((val) => Number.parseFloat(val))
		.default("1000"),
	ATP_CRON_SCHEDULE: z.string().default("0 */3 * * *"),
});

export const env = envSchema.parse(process.env);
