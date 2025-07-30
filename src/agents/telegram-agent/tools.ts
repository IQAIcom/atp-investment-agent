import { env } from "@/env";
import { type BaseTool, McpTelegram, type SamplingHandler } from "@iqai/adk";

let tools: BaseTool[];

export const getTelegramTools = async (samplingHandler?: SamplingHandler) => {
	if (!tools) {
		const toolset = McpTelegram({
			samplingHandler,
			env: {
				TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
				TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
				SAMPLING_RESPOND_TO_DMS: false,
			},
		});
		tools = await toolset.getTools();
	}

	return tools;
};
