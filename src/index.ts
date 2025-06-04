import {
	type BaseTool,
	LLMRegistry,
	type McpConfig,
	type MessageRole,
	OpenAILLM,
} from "@iqai/adk";
import { McpError, McpToolset } from "@iqai/adk";
import * as dotenv from "dotenv";
import * as cron from "node-cron";
import { AtpInvestmentAgent } from "./agents/atp-investment-agent";
import { env } from "./env";
import { type WalletInfo, WalletService } from "./services/wallet";

dotenv.config();
LLMRegistry.registerLLM(OpenAILLM);

const DEBUG = env.DEBUG === "true";
const MAX_RUN_OUTPUTS = 10;

interface AppState {
	atpToolset: McpToolset | null;
	telegramToolset: McpToolset | null;
	agent: AtpInvestmentAgent | null;
	walletInfo: WalletInfo | null;
	runOutputs: string[];
}

const state: AppState = {
	atpToolset: null,
	telegramToolset: null,
	agent: null,
	walletInfo: null,
	runOutputs: [],
};

function validateEnvironment(): void {
	if (!env.WALLET_PRIVATE_KEY) {
		console.error("❌ Error: WALLET_PRIVATE_KEY is required in .env file");
		process.exit(1);
	}
	if (!env.LLM_MODEL) {
		console.error("❌ Error: LLM_MODEL is required in .env file");
		process.exit(1);
	}
}

async function initializeAtpToolset(): Promise<BaseTool[]> {
	console.log("🔄 Connecting to ATP MCP server...");

	const config: McpConfig = {
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

	state.atpToolset = new McpToolset(config);
	const tools = await state.atpToolset.getTools();

	if (tools.length === 0) {
		console.warn("⚠️ No ATP tools retrieved from MCP server.");
		process.exit(1);
	}

	console.log(`✅ Connected to ATP MCP (${tools.length} tools available)`);
	return tools;
}

async function initializeTelegramToolset(): Promise<BaseTool[]> {
	if (
		!env.TELEGRAM_BOT_TOKEN ||
		!env.TELEGRAM_CHAT_ID ||
		!env.TELEGRAM_SERVER_KEY
	) {
		return [];
	}

	console.log("🔄 Connecting to Telegram MCP server...");

	const config: McpConfig = {
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

	state.telegramToolset = new McpToolset(config);
	const tools = await state.telegramToolset.getTools();

	console.log(`✅ Connected to Telegram MCP (${tools.length} tools available)`);
	return tools;
}

async function initializeWallet(): Promise<WalletInfo> {
	const walletService = new WalletService(env.WALLET_PRIVATE_KEY);
	return await walletService.displayWalletStatus();
}

async function setup(): Promise<void> {
	console.log("🤖 Starting ATP Investment Agent Demo");
	console.log(
		`💰 Real investments will be made with your IQ tokens (${env.ATP_INVESTMENT_PERCENTAGE * 100}% of balance)`,
	);
	console.log("🔐 Using wallet private key from environment variables");
	console.log("====================================");

	validateEnvironment();

	try {
		const [atpTools, telegramTools, walletInfo] = await Promise.all([
			initializeAtpToolset(),
			initializeTelegramToolset(),
			initializeWallet(),
		]);

		state.walletInfo = walletInfo;
		state.agent = new AtpInvestmentAgent(
			atpTools,
			telegramTools,
			env.LLM_MODEL,
		);

		console.log("🤖 ATP Investment Agent initialized successfully");
	} catch (error) {
		console.error("❌ Setup failed:", error);
		process.exit(1);
	}
}

function buildContextMessage(): string {
	if (state.runOutputs.length === 0) return "";

	return `Previous run outputs (last ${state.runOutputs.length}):
${state.runOutputs.map((log, i) => `${i + 1}. ${log}`).join("\n")}
---
`;
}

function buildWalletMessage(): string {
	if (!state.walletInfo) return "";

	return `Wallet Information:
- Address: ${state.walletInfo.address}
- IQ Balance: ${state.walletInfo.iqBalance} IQ
- Investment Budget: ${state.walletInfo.investmentAmount} IQ`;
}

async function runAgentCycle(): Promise<void> {
	if (!state.agent || !state.walletInfo) {
		console.error("❌ Agent or wallet info not initialized");
		return;
	}

	try {
		const messages = [
			{ role: "system" as MessageRole, content: buildContextMessage() },
			{ role: "user" as MessageRole, content: buildWalletMessage() },
		];

		console.log("🚀 Starting ATP investment workflow...");
		const result = await state.agent.run({ messages });
		console.log("🎯 ATP Investment Workflow Complete!");

		if (result.content) {
			console.log(`Final Result: ${result.content}`);
			state.runOutputs.push(result.content);
			if (state.runOutputs.length > MAX_RUN_OUTPUTS) {
				state.runOutputs.shift();
			}
		} else {
			console.log("❌ Warning: Final result content is empty");
		}
	} catch (error) {
		if (error instanceof McpError) {
			console.error(`❌ MCP Error (${error.type}): ${error.message}`);
		} else {
			console.error("❌ Unexpected error:", error);
		}
	}
}

async function cleanup(): Promise<void> {
	console.log("🧹 Cleaning up MCP connections...");

	await Promise.allSettled([
		state.atpToolset?.close(),
		state.telegramToolset?.close(),
	]);

	console.log("✅ Cleanup complete");
}

async function runOnce(): Promise<void> {
	console.log("🏃 Running agent once...");
	await runAgentCycle();
	await cleanup();
	process.exit(0);
}

async function runScheduled(): Promise<void> {
	const cronSchedule = env.ATP_CRON_SCHEDULE;
	console.log(`⏰ Scheduling agent to run: ${cronSchedule}`);

	cron.schedule(cronSchedule, runAgentCycle, { timezone: "UTC" });
	await runAgentCycle();
	process.stdin.resume();
}

async function main(): Promise<void> {
	await setup();

	const runMode = process.argv[2];
	if (runMode === "--once" || runMode === "-1") {
		await runOnce();
	} else {
		await runScheduled();
	}
}

// Signal handlers
const gracefulShutdown = async (signal: string) => {
	console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
	await cleanup();
	process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start the application
main().catch((error) => {
	console.error("❌ Application failed:", error);
	process.exit(1);
});
