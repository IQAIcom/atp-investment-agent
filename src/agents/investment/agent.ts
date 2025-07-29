import { model } from "@/env";
import {
	AgentBuilder,
	type BuiltAgent,
	InMemorySessionService,
} from "@iqai/adk";
import { createAcquireAgent } from "./sub-agents/aquire/agent";
import { createTelegramNotifierAgent } from "./sub-agents/notifier/agent";

export async function createAtpInvestmentAgent(): Promise<BuiltAgent> {
	const acquireAgent = await createAcquireAgent();
	const notifierAgent = await createTelegramNotifierAgent();

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
		.asSequential([acquireAgent, notifierAgent])
		.build();
}
