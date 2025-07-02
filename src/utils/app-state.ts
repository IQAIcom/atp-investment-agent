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
				...(env.ATP_API_URL ? { ATP_API_URL: env.ATP_API_URL } : {}),
				...(env.ATP_AGENT_ROUTER_ADDRESS
					? { ATP_AGENT_ROUTER_ADDRESS: env.ATP_AGENT_ROUTER_ADDRESS }
					: {}),
				ATP_BASE_TOKEN_ADDRESS: env.IQ_ADDRESS,
				PATH: env.PATH,
			},
		},
	};
}

export function createTelegramConfig(): McpConfig | null {
	return {
		name: "Telegram MCP Client",
		description: "Client for Telegram notifications",
		debug: DEBUG,
		retryOptions: { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", "@iqai/mcp-telegram"],
			env: {
				TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
				PATH: env.PATH,
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

export function buildContext(): string {
	const context =
		state.runOutputs.length > 0
			? `Previous runs: ${state.runOutputs.slice(-3).join(", ")}\n---\n`
			: "";

	const wallet = state.walletInfo
		? `Address: ${state.walletInfo.address}\nIQ Balance: ${state.walletInfo.iqBalance}\nBudget: ${state.walletInfo.investmentAmount}`
		: "";

	return `
	Context:
	${context}

	Wallet:
	${wallet}`;
}

export function saveResult(content: string): void {
	state.runOutputs.push(content);
	if (state.runOutputs.length > 10) state.runOutputs.shift();
}
