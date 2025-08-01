import { type BaseTool, McpTelegram, type SamplingHandler } from "@iqai/adk";

let tools: BaseTool[];

export const getTelegramTools = async (samplingHandler?: SamplingHandler) => {
	if (!tools) {
		const toolset = McpTelegram({
			samplingHandler,
			env: process.env,
		});
		tools = await toolset.getTools();
	}

	return tools;
};
