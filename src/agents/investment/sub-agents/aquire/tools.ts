import { env } from "@/env";
import { BaseTool, createTool } from "@iqai/adk";
import { McpAtp } from "@iqai/adk";
import * as z from "zod";

let tools: BaseTool[];

export const getAtpTools = async () => {
	if (!tools) {
		const toolset = McpAtp({
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

		tools = await toolset.getTools();
	}
	return tools;
};

export const saveInvestmentResult = createTool({
	name: "save_investment_result",
	description:
		"Save structured investment result to persistent state for future reference",
	schema: z.object({
		agent_name: z.string().describe("Name of the agent purchased"),
		agent_address: z.string().describe("Contract address of the agent"),
		amount: z.string().describe("Amount invested (e.g., '8.95 IQ')"),
		success: z.boolean().describe("Whether the investment was successful"),
		transaction_hash: z
			.string()
			.optional()
			.describe("Transaction hash if successful"),
		error: z.string().optional().describe("Error message if failed"),
		reasoning: z
			.string()
			.describe("Brief explanation of the investment decision"),
		timestamp: z
			.string()
			.optional()
			.describe("ISO timestamp (will be auto-generated if not provided)"),
	}),
	fn: (params, context) => {
		const timestamp = params.timestamp || new Date().toISOString();

		const investmentRecord = {
			...params,
			timestamp,
		};

		// Get existing investment history
		const investmentHistory = context.state.get("investment_history", []);
		investmentHistory.push(investmentRecord);

		// Keep only last 20 records to prevent bloat
		if (investmentHistory.length > 20) {
			investmentHistory.splice(0, investmentHistory.length - 20);
		}

		context.state.set("investment_history", investmentHistory);

		return {
			success: true,
			message: `Investment result saved: ${params.success ? "SUCCESS" : "FAILED"} - ${params.agent_name}`,
			total_records: investmentHistory.length,
		};
	},
});
