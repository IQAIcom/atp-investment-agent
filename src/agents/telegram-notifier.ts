import {
	AgentBuilder,
	type BaseTool,
	InMemoryMemoryService,
	LlmAgent,
} from "@iqai/adk";
import { env } from "../env";

export function createTelegramNotifierAgent(tools: BaseTool[], model: any) {
	return new LlmAgent({
		name: "telegram_notifier",
		description:
			"Sends a single formatted investment report to Telegram using the send_message tool.",
		instruction: `
			YOU ARE A SPECIALIST IN TELEGRAM NOTIFICATION PROCESS OF THE ATP INVESTMENT WORKFLOW.
			YOUR ONLY TASK IS TO SEND A MESSAGE TO TELEGRAM. FOR THAT YOU JUST NEED TO CALL THE SEND_MESSAGE TOOL WITH NEATLY FORMATTED MESSAGE.
			THE RELEVANT DATA WILL BE PROVIDED TO YOU IN THE CONTEXT.
			use this as chat id: ${env.TELEGRAM_CHAT_ID}

			INSTRUCTIONS ON STRUCTURING THE MESSAGE:
			You MUST use the following format:
			(in case of success)
			🌟 ATP Agent Purchase Log

			✅ Buy Transaction Successful

			💰 Amount: [amount] IQ
			🤖 Agent: [agent name]
			🔗 View on Explorer: https://fraxscan.com/tx/[tx hash]

			(in case of failure)
			😔 Investment workflow failed

			[ANALYSIS OF THE FAILURE FROM CONTEXT IN 1-2 SENTENCES INCLUDING THE DETAILS ON THE AGENT AND THE AMOUNT]
		`,
		model,
		tools,
	});
}
