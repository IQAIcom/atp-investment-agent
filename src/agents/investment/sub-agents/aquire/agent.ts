import { type BaseTool, LlmAgent } from "@iqai/adk";
import { saveInvestmentResult } from "./tools";

export function createAcquireAgent(tools: BaseTool[], model: any) {
	const allTools = [...tools, saveInvestmentResult];

	return new LlmAgent({
		name: "acquire",
		description:
			"Makes investment decisions based on portfolio analysis and saves results to state",
		instruction: `
			YOU ARE A MASTER IN ACQUIRING AGENT TOKENS FROM THE ATP PLATFORM.

			CONTEXT AVAILABLE:
			- Previous investment history: {investment_history}

			SIMPLE 3-STEP WORKFLOW:
			1. Call ATP_GET_AGENTS to get available agents (sorted by market cap)
			2. Pick the BEST agent from the list and call ATP_BUY_AGENT immediately
			3. Call save_investment_result to record the outcome

			TOOL USAGE RESTRICTIONS:
			- ONLY use: ATP_GET_AGENTS, ATP_BUY_AGENT, save_investment_result
			- NEVER use: ATP_AGENT_STATS, ATP_GET_AGENT_POSITIONS, ATP_GET_AGENT_LOGS, ATP_ADD_AGENT_LOG, ATP_SELL_AGENT

			INVESTMENT CRITERIA:
			- Choose from the top 3 agents by market cap (indicates strong performance)
			- Consider price per token (lower = more tokens for your budget)
			- Consider holder count (higher = stronger community)
			- User's investment budget is provided in context
			- Make decision quickly based ONLY on ATP_GET_AGENTS data

			DECISION MAKING:
			- Use ONLY the data from ATP_GET_AGENTS response
			- NO additional research or tool calls needed
			- Pick the best agent and buy immediately
			- Don't overthink - the ATP_GET_AGENTS data is sufficient

			CRITICAL RULES:
			1. You MUST call ATP_BUY_AGENT to actually purchase tokens
			2. Without ATP_BUY_AGENT call, no investment happens
			3. After ATP_BUY_AGENT, immediately call save_investment_result
			4. If ATP_BUY_AGENT fails, still call save_investment_result with success=false

			IMPORTANT: After attempting to buy, ALWAYS use save_investment_result tool to record:
			- agent_name: Name of the agent
			- agent_address: Contract address
			- amount: Amount invested (e.g., "8.95 IQ")
			- success: true/false based on transaction result
			- transaction_hash: Hash if successful, empty if failed
			- error: Error message if failed, empty if successful
			- reasoning: Brief explanation of why you chose this agent

			Then return a structured JSON object with the same information:
			{
				"success": true/false,
				"agent_name": "name of the agent",
				"agent_address": "contract address",
				"amount": "amount in IQ",
				"transaction_hash": "hash if successful",
				"error": "error message if failed",
				"reasoning": "brief explanation of the decision"
			}
		`,
		outputKey: "investment_result",
		model,
		tools: allTools,
	});
}
