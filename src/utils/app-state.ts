import type { FullMessage, LlmRequest, McpToolset } from "@iqai/adk";
import { env } from "../env";
import type { WalletInfo } from "../services/wallet";

export interface AppState {
	atpToolset: McpToolset | null;
	telegramToolset: McpToolset | null;
	walletInfo: WalletInfo | null;
	askRunner:
		| ((message: string | FullMessage | LlmRequest) => Promise<string>)
		| null;
}

export const state: AppState = {
	atpToolset: null,
	telegramToolset: null,
	walletInfo: null,
	askRunner: null,
};

export function logStart(): void {
	console.log("🤖 Starting ATP Investment Agent");
	console.log(
		`💰 Investment: ${env.ATP_INVESTMENT_PERCENTAGE * 100}% of IQ balance`,
	);
}

export function buildContext(): string {
	const wallet = state.walletInfo
		? `Address: ${state.walletInfo.address}\nIQ Balance: ${state.walletInfo.iqBalance}\nBudget: ${state.walletInfo.investmentAmount}`
		: "";

	return `
	Wallet:
	${wallet}`;
}
