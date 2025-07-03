import { AgentBuilder, type BaseTool, type BuiltAgent } from "@iqai/adk";
import { createAcquireAgent } from "./acquire";
import { createTelegramNotifierAgent } from "./telegram-notifier";

export async function createAtpInvestmentAgent(
	atpTools: BaseTool[],
	telegramTools: BaseTool[],
	llmModel: string,
): Promise<BuiltAgent> {
	// Create sub-agents
	const acquireAgent = await createAcquireAgent(atpTools, llmModel);
	const telegramAgent = await createTelegramNotifierAgent(
		telegramTools,
		llmModel,
	);

	// Create the main workflow using LangGraph agent type
	return await AgentBuilder.create("atp_investment_workflow")
		.withDescription(
			"Autonomous ATP agent investment workflow with discovery, analysis, and execution",
		)
		.asLangGraph(
			[
				{
					name: "acquire",
					agent: acquireAgent.agent,
					targets: ["telegram_notifier"],
				},
				{
					name: "telegram_notifier",
					agent: telegramAgent.agent,
					condition: (_) => true,
					targets: [],
				},
			],
			"acquire",
		)
		.withQuickSession("atp_investment_workflow", "uid_1234")
		.build();
}
