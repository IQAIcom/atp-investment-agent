import * as dotenv from "dotenv";
import {
	createAtpInvestmentAgent,
	initializeSocialsAgent,
} from "./agents/investment/agent";
import { env } from "./env";
import { initializeTelegramToolset, runScheduled } from "./runner";
import { WalletService } from "./services/wallet";
import { logStart, state } from "./utils/app-state";

dotenv.config();

async function main() {
	const builtAgent = await setup();
	await runScheduled(builtAgent);
}

async function setup() {
	logStart();
	await initializeSocialsAgent();
	await initializeTelegramToolset();
	const walletService = new WalletService(env.WALLET_PRIVATE_KEY);

	state.walletInfo = await walletService.displayWalletStatus();

	return createAtpInvestmentAgent();
}

main().catch((error) => {
	console.error("❌ Application failed:", error);
	process.exit(1);
});
