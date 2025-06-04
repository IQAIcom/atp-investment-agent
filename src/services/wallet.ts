import { createPublicClient } from "viem";
import { http } from "viem";
import { erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { fraxtal } from "viem/chains";
import { env } from "../env";

const IQT_ADDRESS = "0xCc3023635dF54FC0e43F47bc4BeB90c3d1fbDa9f";
const IQ_ADDRESS = "0x6EFB84bda519726Fa1c65558e520B92b51712101";
export const IQ_TOKEN_ADDRESS =
	env.ATP_USE_DEV === "true" ? IQT_ADDRESS : IQ_ADDRESS;

export interface WalletInfo {
	address: string;
	iqBalance: string;
	investmentAmount: string;
	formattedBalance: string;
	formattedInvestment: string;
}

export interface WalletValidationResult {
	isValid: boolean;
	error?: string;
	recommendation?: string;
}

export class WalletService {
	private privateKey: string;
	private minInvestmentAmount: number;
	private investmentPercentage: number;

	constructor(
		privateKey: string,
		minInvestmentAmount = 10,
		investmentPercentage = 0.01,
	) {
		this.privateKey = privateKey;
		this.minInvestmentAmount = minInvestmentAmount;
		this.investmentPercentage = investmentPercentage;
	}

	/**
	 * Gathers complete wallet information including balance and investment calculations
	 */
	async getWalletInfo(): Promise<WalletInfo> {
		console.log("💰 Getting wallet information...");

		try {
			const address = this.getWalletAddress(this.privateKey);
			const iqBalance = await this.getIqBalance(address);
			const investmentAmount = this.calculateInvestmentAmount(
				iqBalance,
				this.investmentPercentage,
			);

			console.log(`📍 Wallet: ${address}`);
			console.log(`💎 IQ Balance: ${iqBalance} IQ`);
			console.log(
				`📊 Investment Amount: ${investmentAmount} IQ (${this.investmentPercentage * 100}%)`,
			);

			return {
				address,
				iqBalance,
				investmentAmount,
				formattedBalance: this.formatIqAmount(iqBalance),
				formattedInvestment: this.formatIqAmount(investmentAmount),
			};
		} catch (error) {
			console.error("❌ Failed to get wallet information:", error);
			throw new Error(
				`Failed to retrieve wallet information: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Validates wallet conditions for investment
	 */
	async validateInvestmentConditions(
		walletInfo?: WalletInfo,
	): Promise<WalletValidationResult> {
		console.log("🎯 Evaluating investment conditions...");

		const info = walletInfo || (await this.getWalletInfo());

		// Check minimum balance
		if (
			!this.validateSufficientBalance(info.iqBalance, info.investmentAmount)
		) {
			return {
				isValid: false,
				error: "Insufficient IQ balance for investment",
				recommendation: `Ensure wallet has sufficient balance including gas fees (need ${(Number.parseFloat(info.investmentAmount) * 1.1).toFixed(2)} IQ minimum)`,
			};
		}

		// Check minimum investment amount
		const investmentNum = Number.parseFloat(info.investmentAmount);
		if (investmentNum < this.minInvestmentAmount) {
			return {
				isValid: false,
				error: `Investment amount ${info.investmentAmount} IQ below minimum ${this.minInvestmentAmount} IQ`,
				recommendation: `Increase wallet balance to at least ${(this.minInvestmentAmount * 100).toFixed(2)} IQ for meaningful investments`,
			};
		}

		console.log("✅ Investment conditions met");
		return { isValid: true };
	}

	/**
	 * Displays comprehensive wallet status
	 */
	async displayWalletStatus(): Promise<WalletInfo> {
		console.log("🔄 Gathering wallet information...");

		const walletInfo = await this.getWalletInfo();
		const validation = await this.validateInvestmentConditions(walletInfo);

		console.log(`📍 Wallet Address: ${walletInfo.address}`);
		console.log(`💰 Current IQ Balance: ${walletInfo.formattedBalance}`);
		console.log(
			`📊 Available for Investment: ${walletInfo.formattedInvestment} (${this.investmentPercentage * 100}% safety limit)`,
		);

		if (!validation.isValid) {
			console.error(`❌ ${validation.error}`);
			if (validation.recommendation) {
				console.log(`💡 Recommendation: ${validation.recommendation}`);
			}
			throw new Error(validation.error);
		}

		return walletInfo;
	}

	/**
	 * Quick balance check without full validation
	 */
	async getQuickBalance(): Promise<{ address: string; balance: string }> {
		const address = this.getWalletAddress(this.privateKey);
		const balance = await this.getIqBalance(address);
		return { address, balance };
	}

	/**
	 * Validates if a specific amount can be invested
	 */
	validateCustomAmount(
		walletBalance: string,
		proposedAmount: string,
	): WalletValidationResult {
		const balanceNum = Number.parseFloat(walletBalance);
		const amountNum = Number.parseFloat(proposedAmount);

		if (amountNum < this.minInvestmentAmount) {
			return {
				isValid: false,
				error: `Amount ${proposedAmount} IQ below minimum ${this.minInvestmentAmount} IQ`,
			};
		}

		// Check if amount exceeds 1% of balance
		const maxAmount = balanceNum * 0.01;
		if (amountNum > maxAmount) {
			return {
				isValid: false,
				error: `Amount ${proposedAmount} IQ exceeds 1% safety limit (${maxAmount.toFixed(2)} IQ)`,
			};
		}

		// Check sufficient balance with buffer for gas
		if (!this.validateSufficientBalance(walletBalance, proposedAmount)) {
			return {
				isValid: false,
				error: "Insufficient balance including gas fee buffer",
			};
		}

		return { isValid: true };
	}
	/**
	 * Updates minimum investment amount
	 */
	setMinInvestmentAmount(amount: number): void {
		this.minInvestmentAmount = amount;
	}

	/**
	 * Reads the IQ token balance for a given wallet address
	 *
	 * @param walletAddress - The wallet address to check balance for
	 * @returns Promise<string> - The IQ balance in human-readable format (not wei)
	 */
	async getIqBalance(walletAddress: string): Promise<string> {
		try {
			const publicClient = createPublicClient({
				chain: fraxtal,
				transport: http(),
			});

			const balance = await publicClient.readContract({
				address: IQ_TOKEN_ADDRESS,
				abi: erc20Abi,
				functionName: "balanceOf",
				args: [walletAddress as `0x${string}`],
			});

			// Convert balance from wei to token units (assuming 18 decimals)
			const formattedBalance = (Number(balance) / 1e18).toFixed(2);
			return formattedBalance;
		} catch (error) {
			console.error("Error reading IQ balance:", error);
			throw new Error(
				`Failed to read IQ balance: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Calculates the investment amount based on the investment percentage
	 *
	 * @param totalBalance - Total IQ balance as string
	 * @param investmentPercentage - Investment percentage as number
	 * @returns string - Investment amount as string
	 */
	calculateInvestmentAmount(
		totalBalance: string,
		investmentPercentage: number,
	): string {
		const balance = Number.parseFloat(totalBalance);
		const investmentAmount = balance * investmentPercentage;

		// Return with reasonable precision (avoid tiny fractions)
		return investmentAmount.toFixed(2);
	}

	/**
	 * Validates if wallet has sufficient IQ balance for investment
	 *
	 * @param balance - Current IQ balance as string
	 * @param investmentAmount - Proposed investment amount as string
	 * @returns boolean - True if sufficient balance available
	 */
	validateSufficientBalance(
		balance: string,
		investmentAmount: string,
	): boolean {
		const balanceNum = Number.parseFloat(balance);
		const investmentNum = Number.parseFloat(investmentAmount);

		// Ensure some buffer (1.1x investment amount) to account for gas fees
		return balanceNum >= investmentNum * 1.1;
	}

	/**
	 * Formats IQ amount for display in notifications
	 *
	 * @param amount - IQ amount as string
	 * @returns string - Formatted amount with appropriate decimal places
	 */
	formatIqAmount(amount: string): string {
		const num = Number.parseFloat(amount);

		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(2)}M IQ`;
		}
		if (num >= 1000) {
			return `${(num / 1000).toFixed(2)}K IQ`;
		}
		return `${num.toFixed(2)} IQ`;
	}

	/**
	 * Gets wallet address from private key
	 *
	 * @param privateKey - Wallet private key (with or without 0x prefix)
	 * @returns string - Wallet address
	 */
	getWalletAddress(privateKey: string): string {
		try {
			// Ensure private key has 0x prefix
			const formattedPrivateKey = privateKey.startsWith("0x")
				? privateKey
				: `0x${privateKey}`;

			const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
			return account.address;
		} catch (error) {
			console.error("Error deriving wallet address:", error);
			throw new Error(
				`Failed to derive wallet address: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
