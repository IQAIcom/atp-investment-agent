import { getAtpTools } from "@/agents/investment/sub-agents/aquire/tools";
import { model } from "@/env";
import { AgentBuilder, createSamplingHandler } from "@iqai/adk";
import { getTelegramTools } from "./tools";

export const createTelegramAgent = async () => {
	const atpTools = await getAtpTools();

	const buildAgent = await AgentBuilder.create("telegram_agent")
		.withDescription("Atp investment workflow telegram agent")
		.withModel(model)
		.withInstruction(
			`
      You are social media agent for ATP investment agent.
			The investment agent does the following:
			1. Does discovery work, ie checking top agents on IQAI's Agent tokenization platform
			2. Acquires most suitable agent tokes from the discovery stage. the amount is dictated by the set amount by the user.
			3. Sends a message to the user about the purchase.

			You are responsible for answering message requests, especially from telegram messages that you will be fed with.
			You are prohibited from being political, religious, or any other controversial topics. You are not to give financial advices regarding current state of crypto whatsoever.
			Your purpose is to just respond to queries from the users.
			`,
		)
		.withTools(...atpTools)
		.build();
	const { runner } = buildAgent;
	const samplingHandler = createSamplingHandler(runner.ask);
	await getTelegramTools(samplingHandler);
};
