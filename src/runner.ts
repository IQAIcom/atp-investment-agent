import {
	type BaseTool,
	type BuiltAgent,
	McpError,
	McpToolset,
} from "@iqai/adk";
import * as cron from "node-cron";
import { env } from "./env";
import {
	buildContext,
	createAtpConfig,
	createTelegramConfig,
	saveResult,
	state,
} from "./utils/app-state";

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

async function runCycle(builtAgent: BuiltAgent) {
	try {
		console.log("🚀 Running investment cycle...");
		const { runner, session } = builtAgent;
		if (!runner || !session) {
			throw new Error("Runner or session not found");
		}
		const context = buildContext();

		for await (const event of runner.runAsync({
			userId: "uid_1234",
			sessionId: session.id,
			newMessage: {
				role: "user",
				parts: [{ text: context }],
			},
		})) {
			if (event.content?.parts) {
				const content = event.content.parts
					.map((part: { text?: string }) => part.text || "")
					.join("");
				if (content) {
					console.log(`✅ Result: ${content}`);
					saveResult(content);
				}
			}
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
