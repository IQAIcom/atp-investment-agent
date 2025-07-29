import { type BaseTool, LlmAgent } from "@iqai/adk";
import { env } from "../../../../env";

export function createTelegramNotifierAgent(tools: BaseTool[], model: any) {
	return new LlmAgent({
		name: "telegram_notifier",
		description:
			"Sends formatted investment notifications to Telegram using structured data from the acquire agent",
		instruction: `
			YOU ARE A TELEGRAM NOTIFICATION SPECIALIST FOR ATP INVESTMENT WORKFLOW.

			AVAILABLE DATA:
			- Investment result from previous agent: {investment_result}
			- Investment history: {investment_history}

			YOUR TASK:
			1. Parse the investment_result JSON data from the acquire agent
			2. Send a formatted message to Telegram using SEND_MESSAGE tool
			3. Use chat ID: ${env.TELEGRAM_CHAT_ID}

			MESSAGE FORMATS:

			For successful investments (success: true):
			🌟 ATP Agent Purchase Log

			✅ Buy Transaction Successful

			🤖 Agent: [agent_name from result]
			💰 Amount: [amount from result]
			🔗 View on Explorer: https://fraxscan.com/tx/[transaction_hash from result]

			💡 Reasoning: [reasoning from result]

			For failed investments (success: false):
			😔 Investment workflow failed

			🤖 Agent: [agent_name from result]
			💰 Amount: [amount from result]
			❌ Error: [error from result]

			💡 Analysis: [reasoning from result]

			IMPORTANT: Always extract the actual values from the investment_result JSON. Never use placeholder text.
		`,
		model,
		tools,
	});
}
