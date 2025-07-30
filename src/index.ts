import * as dotenv from "dotenv";
import { createAtpInvestmentAgent } from "./agents/investment/agent";
import { createTelegramAgent } from "./agents/telegram-agent/agent";
import { runScheduled } from "./cron";

dotenv.config();

async function main() {
	await createTelegramAgent();
	const builtAgent = await createAtpInvestmentAgent();
	await runScheduled(builtAgent);
}

main().catch((error) => {
	console.error("❌ Application failed:", error);
	process.exit(1);
});
