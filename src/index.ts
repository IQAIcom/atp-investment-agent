import * as dotenv from "dotenv";
import { AtpInvestmentAgent } from "./agents/atp-investment-agent";
import { env } from "./env";
import { initializeToolsets, runOnce, runScheduled } from "./runner";
import { WalletService } from "./services/wallet";
import { logStart, state } from "./utils/app-state";

dotenv.config();

async function main() {
	const agent = await setup();
	const runMode = process.argv[2];

	if (runMode === "--once" || runMode === "-1") {
		await runOnce(agent);
	} else {
		await runScheduled(agent);
	}
}

async function setup(): Promise<AtpInvestmentAgent> {
	logStart();

	const { atpTools, telegramTools } = await initializeToolsets();
	const walletService = new WalletService(env.WALLET_PRIVATE_KEY);

	state.walletInfo = await walletService.displayWalletStatus();

	return new AtpInvestmentAgent(atpTools, telegramTools, env.LLM_MODEL);
}

main().catch((error) => {
	console.error("❌ Application failed:", error);
	process.exit(1);
});
