import {
	type BaseTool,
	LLMRegistry,
	McpError,
	McpToolset,
	type MessageRole,
	OpenAILLM,
} from "@iqai/adk";
import * as cron from "node-cron";
import { AtpInvestmentAgent } from "./agents/atp-investment-agent";
import { env } from "./env";
import { WalletService } from "./services/wallet";
import {
	buildMessages,
	createAtpConfig,
	createTelegramConfig,
	logStart,
	saveResult,
	state,
	validateEnvironment,
} from "./utils/app-state";

LLMRegistry.registerLLM(OpenAILLM);

async function initializeToolsets() {
	const atpConfig = createAtpConfig();
	state.atpToolset = new McpToolset(atpConfig);
	const atpTools = await state.atpToolset.getTools();

	const telegramConfig = createTelegramConfig();
	let telegramTools: BaseTool[] = [];
	if (telegramConfig) {
		state.telegramToolset = new McpToolset(telegramConfig);
		telegramTools = await state.telegramToolset.getTools();
	}

	if (atpTools.length === 0) {
		console.error("❌ No ATP tools available");
		process.exit(1);
	}

	return { atpTools, telegramTools };
}

async function setup() {
	logStart();
	validateEnvironment();

	const { atpTools, telegramTools } = await initializeToolsets();
	const walletService = new WalletService(env.WALLET_PRIVATE_KEY);

	state.walletInfo = await walletService.displayWalletStatus();

	return new AtpInvestmentAgent(atpTools, telegramTools, env.LLM_MODEL);
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

async function cleanup() {
	await Promise.allSettled([
		state.atpToolset?.close(),
		state.telegramToolset?.close(),
	]);
}

export async function runOnce() {
	const agent = await setup();
	await runCycle(agent);
	await cleanup();
}

export async function runScheduled() {
	const agent = await setup();

	console.log(`⏰ Scheduled: ${env.ATP_CRON_SCHEDULE}`);
	cron.schedule(env.ATP_CRON_SCHEDULE, () => runCycle(agent), {
		timezone: "UTC",
	});

	await runCycle(agent);
	process.stdin.resume();
}

export { cleanup };
