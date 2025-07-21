import fs from "node:fs";
import path from "node:path";
import type { FullMessage, LlmRequest, McpToolset } from "@iqai/adk";
import { env } from "../env";
import type { WalletInfo } from "../services/wallet";

export interface AppState {
	atpToolset: McpToolset | null;
	telegramToolset: McpToolset | null;
	walletInfo: WalletInfo | null;
	runOutputs: string[];
	askRunner:
		| ((message: string | FullMessage | LlmRequest) => Promise<string>)
		| null;
}

export const state: AppState = {
	atpToolset: null,
	telegramToolset: null,
	walletInfo: null,
	askRunner: null,
	runOutputs: [],
};

/**
 * Get SQLite connection string for the given database name
 * Creates the directory if it doesn't exist
 * @param dbName Name of the database file (without extension)
 * @returns SQLite connection string
 */
export function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);

	// Ensure the directory exists
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}

	return `sqlite://${dbPath}`;
}

export function logStart(): void {
	console.log("🤖 Starting ATP Investment Agent");
	console.log(
		`💰 Investment: ${env.ATP_INVESTMENT_PERCENTAGE * 100}% of IQ balance`,
	);
}

export function buildContext(): string {
	const context =
		state.runOutputs.length > 0
			? `Previous runs: ${state.runOutputs.slice(-3).join(", ")}\n---\n`
			: "";

	const wallet = state.walletInfo
		? `Address: ${state.walletInfo.address}\nIQ Balance: ${state.walletInfo.iqBalance}\nBudget: ${state.walletInfo.investmentAmount}`
		: "";

	return `
	Context:
	${context}

	Wallet:
	${wallet}`;
}

export function saveResult(content: string): void {
	state.runOutputs.push(content);
	if (state.runOutputs.length > 10) state.runOutputs.shift();
}
