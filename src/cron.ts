import { type BuiltAgent, McpError } from "@iqai/adk";
import * as cron from "node-cron";
import { env } from "./env";
import { WalletService } from "./services/wallet";

const walletService = new WalletService(env.WALLET_PRIVATE_KEY);

export async function runScheduled(builtAgent: BuiltAgent) {
	console.log(`⏰ Scheduled: ${env.ATP_CRON_SCHEDULE}`);

	cron.schedule(
		env.ATP_CRON_SCHEDULE,
		async () => {
			await runCycle(builtAgent);
		},
		{
			timezone: "UTC",
		},
	);

	process.stdin.resume();
}

export async function buildContext(): Promise<string> {
	const walletStatus = await walletService.displayWalletStatus();
	const wallet = walletStatus
		? `Address: ${walletStatus.address}\nIQ Balance: ${walletStatus.iqBalance}\nBudget: ${walletStatus.investmentAmount}`
		: "";

	return `
	Wallet:
	${wallet}`;
}
async function runCycle(builtAgent: BuiltAgent) {
	try {
		console.log("🚀 Running investment cycle...");
		const { runner } = builtAgent;
		const context = await buildContext();
		const response = await runner.ask(context);
		console.log(`✅ Result: ${response}`);
	} catch (error) {
		const errorMsg =
			error instanceof McpError
				? `${error.type}: ${error.message}`
				: String(error);
		console.error(`❌ Error: ${errorMsg}`);
	}
}

const gracefulShutdown = async (signal: string) => {
	console.log(`🛑 ${signal} received, shutting down...`);
	process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
