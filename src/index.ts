import * as dotenv from "dotenv";
import { cleanup, runOnce, runScheduled } from "./runner";

dotenv.config();

const gracefulShutdown = async (signal: string) => {
	console.log(`🛑 ${signal} received, shutting down...`);
	await cleanup();
	process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

async function main() {
	const runMode = process.argv[2];

	if (runMode === "--once" || runMode === "-1") {
		await runOnce();
	} else {
		await runScheduled();
	}
}

main().catch((error) => {
	console.error("❌ Application failed:", error);
	process.exit(1);
});
