import {
	type BaseTool,
	McpError,
	McpToolset,
	type MessageRole,
} from "@iqai/adk";
import * as cron from "node-cron";
import type { AtpInvestmentAgent } from "./agents/atp-investment-agent";
import { env } from "./env";
import {
	buildMessages,
	createAtpConfig,
	createTelegramConfig,
	saveResult,
	state,
} from "./utils/app-state";

export async function runOnce(agent: AtpInvestmentAgent) {
	await runCycle(agent);
	await cleanup();
}

export async function runScheduled(agent: AtpInvestmentAgent) {
	console.log(`⏰ Scheduled: ${env.ATP_CRON_SCHEDULE}`);
	cron.schedule(env.ATP_CRON_SCHEDULE, () => runCycle(agent), {
		timezone: "UTC",
	});

	await runCycle(agent);
	process.stdin.resume();
}

export async function initializeToolsets() {
	const atpConfig = createAtpConfig();
	state.atpToolset = new McpToolset(atpConfig);
	const atpTools = await state.atpToolset.getTools();

	const telegramConfig = createTelegramConfig();
	let telegramTools: BaseTool[] = [];
	if (telegramConfig) {
		state.telegramToolset = new McpToolset(telegramConfig);
		telegramTools = await state.telegramToolset.getTools();
	}

	return { atpTools, telegramTools };
}

async function runCycle(agent: AtpInvestmentAgent) {
	try {
		console.log("🚀 Running investment cycle...");
		const messages = buildMessages().map((msg) => ({
			...msg,
			role: msg.role as MessageRole,
		}));
		const result = await agent.run({ messages });

		if (result.content) {
			console.log(`✅ Result: ${result.content}`);
			saveResult(result.content);
		}
	} catch (error) {
		const errorMsg =
			error instanceof McpError
				? `${error.type}: ${error.message}`
				: String(error);
		console.error(`❌ Error: ${errorMsg}`);
	}
}

export async function cleanup() {
	await Promise.allSettled([
		state.atpToolset?.close(),
		state.telegramToolset?.close(),
	]);
}

const gracefulShutdown = async (signal: string) => {
	console.log(`🛑 ${signal} received, shutting down...`);
	await cleanup();
	process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
