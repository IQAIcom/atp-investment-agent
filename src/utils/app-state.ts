import type { McpConfig } from "@iqai/adk";
import type { McpToolset } from "@iqai/adk";
import { env } from "../env";
import type { WalletInfo } from "../services/wallet";

const DEBUG = env.DEBUG === "true";

export interface AppState {
	atpToolset: McpToolset | null;
	telegramToolset: McpToolset | null;
	walletInfo: WalletInfo | null;
	runOutputs: string[];
}

export const state: AppState = {
	atpToolset: null,
	telegramToolset: null,
	walletInfo: null,
	runOutputs: [],
};

export function validateEnvironment(): void {
	if (!env.WALLET_PRIVATE_KEY || !env.LLM_MODEL) {
		console.error("❌ Missing required environment variables");
		process.exit(1);
	}
}

export function createAtpConfig(): McpConfig {
	return {
		name: "ATP MCP Client",
		description: "Client for ATP agent investments",
		debug: DEBUG,
		retryOptions: { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", "@iqai/mcp-atp"],
			env: {
				ATP_WALLET_PRIVATE_KEY: env.WALLET_PRIVATE_KEY,
				PATH: process.env.PATH || "",
				ATP_USE_DEV: env.ATP_USE_DEV,
			},
		},
	};
}

export function createTelegramConfig(): McpConfig | null {
	if (
		!env.TELEGRAM_BOT_TOKEN ||
		!env.TELEGRAM_CHAT_ID ||
		!env.TELEGRAM_SERVER_KEY
	) {
		return null;
	}

	return {
		name: "Telegram MCP Client",
		description: "Client for Telegram notifications",
		debug: DEBUG,
		retryOptions: { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: [
				"-y",
				"@smithery/cli@latest",
				"run",
				"@NexusX-MCP/telegram-mcp-server",
				"--key",
				env.TELEGRAM_SERVER_KEY,
				"--profile",
				env.TELEGRAM_PROFILE_ID,
			],
			env: {
				TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
				TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
				PATH: process.env.PATH || "",
			},
		},
	};
}

export function logStart(): void {
	console.log("🤖 Starting ATP Investment Agent");
	console.log(
		`💰 Investment: ${env.ATP_INVESTMENT_PERCENTAGE * 100}% of IQ balance`,
	);
}

export function buildMessages(): Array<{ role: string; content: string }> {
	const context =
		state.runOutputs.length > 0
			? `Previous runs: ${state.runOutputs.slice(-3).join(", ")}\n---\n`
			: "";

	const wallet = state.walletInfo
		? `Address: ${state.walletInfo.address}\nIQ Balance: ${state.walletInfo.iqBalance}\nBudget: ${state.walletInfo.investmentAmount}`
		: "";

	return [
		{ role: "system", content: context },
		{ role: "user", content: wallet },
	];
}

export function saveResult(content: string): void {
	state.runOutputs.push(content);
	if (state.runOutputs.length > 10) state.runOutputs.shift();
}
