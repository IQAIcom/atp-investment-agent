import {
	type BaseTool,
	LangGraphAgent,
	type LangGraphAgentConfig,
} from "@iqai/adk";
import { AcquireAgent } from "./acquire";
import { TelegramNotifierAgent } from "./telegram-notifier";

export class AtpInvestmentAgent extends LangGraphAgent {
	constructor(
		atpTools: BaseTool[],
		telegramTools: BaseTool[],
		llmModel: string,
	) {
		const config: LangGraphAgentConfig = {
			name: "atp_investment_workflow",
			description:
				"Autonomous ATP agent investment workflow with discovery, analysis, and execution",
			nodes: [
				{
					name: "acquire",
					agent: new AcquireAgent(atpTools, llmModel),
					targets: ["telegram_notifier"],
				},
				{
					name: "telegram_notifier",
					agent: new TelegramNotifierAgent(telegramTools, llmModel),
					condition: (_) => true,
					targets: [],
				},
			],
			rootNode: "acquire",
			maxSteps: 12,
		};

		super(config);
	}
}
