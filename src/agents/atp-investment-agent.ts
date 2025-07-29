import {
	AgentBuilder,
	type BuiltAgent,
	InMemorySessionService,
	McpAtp,
} from "@iqai/adk";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../env";
import { state } from "../utils/app-state";
import { createAcquireAgent } from "./acquire";
import { createTelegramNotifierAgent } from "./telegram-notifier";

let model: any;
if (env.OPEN_ROUTER_KEY) {
	console.log("🚀 AGENT WILL USE OPENROUTER 🚀");
	const openrouter = createOpenRouter({
		apiKey: env.OPEN_ROUTER_KEY,
	});
	model = openrouter(env.LLM_MODEL);
} else {
	model = env.LLM_MODEL;
}

export async function createAtpInvestmentAgent(): Promise<BuiltAgent> {
	if (!state.atpToolset || !state.telegramToolset) {
		throw new Error("❌ Atp toolset or Telegram toolset not set in app state");
	}
	const atpTools = await state.atpToolset.getTools();
	const telegramTools = await state.telegramToolset.getTools();

	const acquireAgent = createAcquireAgent(atpTools, model);
	const telegramAgent = createTelegramNotifierAgent(telegramTools, model);

	// Set up session service with initial state
	const sessionService = new InMemorySessionService();
	const initialState = {
		investment_history: [],
	};
	const sessionConfig = { state: initialState };

	return await AgentBuilder.create("atp_investment_workflow")
		.withDescription(
			"ATP investment workflow with persistent state and structured data management",
		)
		.withModel(model)
		.withSessionService(sessionService, sessionConfig)
		.asSequential([acquireAgent, telegramAgent])
		.build();
}

export async function initializeSocialsAgent() {
	state.atpToolset = McpAtp({
		env: {
			ATP_WALLET_PRIVATE_KEY: env.WALLET_PRIVATE_KEY,
			...(env.ATP_API_URL ? { ATP_API_URL: env.ATP_API_URL } : {}),
			...(env.ATP_AGENT_ROUTER_ADDRESS
				? { ATP_AGENT_ROUTER_ADDRESS: env.ATP_AGENT_ROUTER_ADDRESS }
				: {}),
			ATP_BASE_TOKEN_ADDRESS: env.IQ_ADDRESS,
			PATH: env.PATH,
		},
	});
	const tools = await state.atpToolset.getTools();
	const builtAgent = await AgentBuilder.create(
		"atp_investment_workflow_social_agent",
	)
		.withModel(model)
		.withDescription("Social media agent")
		.withInstruction(`
			You are social media agent for ATP investment agent.
			The investment agent does the following:
			1. Does discovery work, ie checking top agents on IQAI's Agent tokenization platform
			2. Acquires most suitable agent tokes from the discovery stage. the amount is dictated by the set amount by the user.
			3. Sends a message to the user about the purchase.

			You are responsible for answering message requests, especially from telegram messages that you will be fed with.
			You are prohibited from being political, religious, or any other controversial topics. You are not to give financial advices regarding current state of crypto whatsoever.
			Your purpose is to just respond to queries from the users.
			`)
		.withTools(...tools)
		.build();
	state.askRunner = builtAgent.runner.ask;
}
