import { createPublicClient } from "viem";
import { erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { WalletService } from "./wallet";

jest.mock("viem", () => ({
	...jest.requireActual("viem"),
	createPublicClient: jest.fn(),
}));

jest.mock("viem/accounts", () => ({
	privateKeyToAccount: jest.fn().mockImplementation(() => ({
		address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
	})),
}));

jest.mock("../env", () => ({
	env: {
		IQ_ADDRESS: "0x123",
		ATP_MIN_INVESTMENT: 100,
		ATP_INVESTMENT_PERCENTAGE: 0.1,
	},
}));

describe("WalletService", () => {
	const mockPrivateKey =
		"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
	const mockAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
	let walletService: WalletService;

	beforeEach(() => {
		jest.clearAllMocks();
		(privateKeyToAccount as jest.Mock).mockReturnValue({
			address: mockAddress,
		});

		walletService = new WalletService(mockPrivateKey);
	});

	describe("constructor", () => {
		it("should initialize with provided private key", () => {
			expect(walletService).toBeInstanceOf(WalletService);
		});

		it("should set default values from env", () => {
			expect(walletService["minInvestmentAmount"]).toBe(100);
			expect(walletService["investmentPercentage"]).toBe(0.1);
		});
	});

	describe("getWalletAddress", () => {
		it("should return wallet address from private key", () => {
			const result = walletService.getWalletAddress(mockPrivateKey);
			expect(result).toBe(mockAddress);
			expect(privateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
		});

		it("should add 0x prefix if missing", () => {
			const noPrefixKey = mockPrivateKey.slice(2);
			walletService.getWalletAddress(noPrefixKey);
			expect(privateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
		});

		it("should throw error for invalid private key", () => {
			(privateKeyToAccount as jest.Mock).mockImplementation(() => {
				throw new Error("Invalid private key");
			});
			expect(() => walletService.getWalletAddress("invalid")).toThrow(
				"Failed to derive wallet address: Invalid private key",
			);
		});
	});

	describe("getIqBalance", () => {
		it("should return formatted IQ balance", async () => {
			const mockBalance = BigInt(150000000000000000000);
			const mockPublicClient = {
				readContract: jest.fn().mockResolvedValue(mockBalance),
			};
			(createPublicClient as jest.Mock).mockReturnValue(mockPublicClient);

			const result = await walletService.getIqBalance(mockAddress);
			expect(result).toBe("150.00");
			expect(mockPublicClient.readContract).toHaveBeenCalledWith({
				address: "0x123",
				abi: erc20Abi,
				functionName: "balanceOf",
				args: [mockAddress],
			});
		});

		it("should throw error when balance fetch fails", async () => {
			const mockPublicClient = {
				readContract: jest.fn().mockRejectedValue(new Error("RPC error")),
			};
			(createPublicClient as jest.Mock).mockReturnValue(mockPublicClient);

			await expect(walletService.getIqBalance(mockAddress)).rejects.toThrow(
				"Failed to read IQ balance: RPC error",
			);
		});
	});

	describe("calculateInvestmentAmount", () => {
		it("should calculate correct investment amount", () => {
			const result = walletService.calculateInvestmentAmount("1000", 0.1);
			expect(result).toBe("100.00");
		});

		it("should handle small amounts correctly", () => {
			const result = walletService.calculateInvestmentAmount("0.123456", 0.1);
			expect(result).toBe("0.01");
		});
	});

	describe("formatIqAmount", () => {
		it("should format small amounts correctly", () => {
			expect(walletService.formatIqAmount("123.456")).toBe("123.46 IQ");
		});

		it("should format thousands correctly", () => {
			expect(walletService.formatIqAmount("12345.678")).toBe("12.35K IQ");
		});

		it("should format millions correctly", () => {
			expect(walletService.formatIqAmount("1234567.89")).toBe("1.23M IQ");
		});
	});

	describe("getWalletInfo", () => {
		it("should return complete wallet info", async () => {
			jest.spyOn(walletService, "getIqBalance").mockResolvedValue("1000.00");
			const result = await walletService.getWalletInfo();

			expect(result).toEqual({
				address: mockAddress,
				iqBalance: "1000.00",
				investmentAmount: "100.00",
				formattedBalance: "1.00K IQ",
				formattedInvestment: "100.00 IQ",
			});
		});

		it("should throw error when balance fetch fails", async () => {
			jest
				.spyOn(walletService, "getIqBalance")
				.mockRejectedValue(new Error("Balance error"));
			await expect(walletService.getWalletInfo()).rejects.toThrow(
				"Failed to retrieve wallet information: Balance error",
			);
		});
	});

	describe("validateInvestmentConditions", () => {
		beforeEach(() => {
			jest.spyOn(walletService, "getWalletInfo").mockResolvedValue({
				address: mockAddress,
				iqBalance: "1100.00",
				investmentAmount: "100.00",
				formattedBalance: "1.10K IQ",
				formattedInvestment: "100.00 IQ",
			});
		});

		it("should return valid when conditions are met", async () => {
			const result = await walletService.validateInvestmentConditions();
			expect(result.isValid).toBe(true);
		});

		it("should return invalid when balance is insufficient", async () => {
			jest.spyOn(walletService, "getWalletInfo").mockResolvedValue({
				address: mockAddress,
				iqBalance: "99.00",
				investmentAmount: "100.00",
				formattedBalance: "99.00 IQ",
				formattedInvestment: "100.00 IQ",
			});

			const result = await walletService.validateInvestmentConditions();
			expect(result.isValid).toBe(false);
			expect(result.error).toContain("Insufficient IQ balance");
		});

		it("should return invalid when investment below minimum", async () => {
			walletService.setMinInvestmentAmount(200);
			const result = await walletService.validateInvestmentConditions();
			expect(result.isValid).toBe(false);
			expect(result.error).toContain("below minimum");
		});

		it("should use provided walletInfo when available", async () => {
			const mockWalletInfo = {
				address: mockAddress,
				iqBalance: "500.00",
				investmentAmount: "50.00",
				formattedBalance: "500.00 IQ",
				formattedInvestment: "50.00 IQ",
			};
			const result =
				await walletService.validateInvestmentConditions(mockWalletInfo);
			expect(result.isValid).toBe(false);
		});
	});

	describe("validateCustomAmount", () => {
		it("should reject amounts below minimum", () => {
			const result = walletService.validateCustomAmount("1000", "50");
			expect(result.isValid).toBe(false);
			expect(result.error).toContain("below minimum");
		});

		it("should reject amounts exceeding 1% of balance", () => {
			const result = walletService.validateCustomAmount("1000", "20");
			expect(result.isValid).toBe(false);
			expect(result.error).toContain("Amount 20 IQ below minimum 100 IQ");
		});
	});

	describe("displayWalletStatus", () => {
		it("should return wallet info when valid", async () => {
			jest.spyOn(walletService, "getWalletInfo").mockResolvedValue({
				address: mockAddress,
				iqBalance: "1100.00",
				investmentAmount: "100.00",
				formattedBalance: "1.10K IQ",
				formattedInvestment: "100.00 IQ",
			});

			const result = await walletService.displayWalletStatus();
			expect(result).toBeDefined();
		});

		it("should throw when validation fails", async () => {
			jest.spyOn(walletService, "getWalletInfo").mockResolvedValue({
				address: mockAddress,
				iqBalance: "50.00",
				investmentAmount: "5.00",
				formattedBalance: "50.00 IQ",
				formattedInvestment: "5.00 IQ",
			});

			await expect(walletService.displayWalletStatus()).rejects.toThrow();
		});
	});

	describe("getQuickBalance", () => {
		it("should return address and balance", async () => {
			jest.spyOn(walletService, "getIqBalance").mockResolvedValue("123.45");
			const result = await walletService.getQuickBalance();
			expect(result).toEqual({
				address: mockAddress,
				balance: "123.45",
			});
		});
	});

	describe("setMinInvestmentAmount", () => {
		it("should update minimum investment amount", () => {
			walletService.setMinInvestmentAmount(500);
			expect(walletService["minInvestmentAmount"]).toBe(500);
		});
	});
});
