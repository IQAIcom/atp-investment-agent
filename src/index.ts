import * as dotenv from "dotenv";
import { createAtpInvestmentAgent } from "./agents/atp-investment-agent";
import { env } from "./env";
import { initializeToolsets, runScheduled } from "./runner";
import { WalletService } from "./services/wallet";
import { logStart, state } from "./utils/app-state";

dotenv.config();

async function main() {
	const builtAgent = await setup();
	await runScheduled(builtAgent);
}

async function setup() {
	logStart();

	const { atpTools, telegramTools } = await initializeToolsets();
	const walletService = new WalletService(env.WALLET_PRIVATE_KEY);

	state.walletInfo = await walletService.displayWalletStatus();

	return createAtpInvestmentAgent(atpTools, telegramTools, env.LLM_MODEL);
}

main().catch((error) => {
	console.error("❌ Application failed:", error);
	process.exit(1);
});
