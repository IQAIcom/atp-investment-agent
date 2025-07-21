import {
	type BuiltAgent,
	McpError,
	McpTelegram,
	createSamplingHandler,
} from "@iqai/adk";
import * as cron from "node-cron";
import { env } from "./env";
import { buildContext, saveResult, state } from "./utils/app-state";

export async function runScheduled(builtAgent: BuiltAgent) {
	console.log(`⏰ Scheduled: ${env.ATP_CRON_SCHEDULE}`);

	cron.schedule(
		env.ATP_CRON_SCHEDULE,
		async () => {
			await runCycle(builtAgent);
		},
		{
			timezone: "UTC",
		},
	);

	process.stdin.resume();
}

export async function initializeTelegramToolset() {
	if (!state.askRunner) {
		throw new Error("askRunner is not initialized");
	}
	const samplingHandler = createSamplingHandler(state.askRunner);

	state.telegramToolset = McpTelegram({
		samplingHandler,
		env: {
			TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
			TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
		},
	});
}

async function runCycle(builtAgent: BuiltAgent) {
	try {
		console.log("🚀 Running investment cycle...");
		const { runner } = builtAgent;
		const context = buildContext();
		const response = await runner.ask(context);
		console.log(`✅ Result: ${response}`);
		saveResult(response);
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
