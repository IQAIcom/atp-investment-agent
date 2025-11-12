import * as dotenv from "dotenv";
import { createTelegramAgent } from "./agents/telegram-agent/agent";
import { runScheduled } from "./cron";

dotenv.config();

async function main() {
	await createTelegramAgent();
	await runScheduled();
}

main().catch((error) => {
	console.error("❌ Application failed:", error);
	process.exit(1);
});
