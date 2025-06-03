# ATP Investment Agent

**ATP Investment Agent** is an autonomous workflow for making AI-driven investments on IQAI's ATP platform. It leverages the [adk-ts](https://github.com/IQAICOM/adk-ts) agent framework and integrates with MCP toolsets for portfolio analysis, agent discovery, investment execution, and Telegram notifications.

## Features

- **Portfolio Analysis:** Analyzes your ATP portfolio and IQ wallet to plan investments.
- **Agent Discovery:** Finds and ranks top-performing ATP agents for new opportunities.
- **Investment Decision:** Uses LLMs to select agents and diversify investments, avoiding repeated or failed agents.
- **Investment Execution:** Executes purchases securely and logs transactions.
- **Telegram Notifications:** Sends formatted investment reports and alerts to your Telegram.

## Workflow

1. **Portfolio Analysis:** Reviews current holdings and available IQ balance.
2. **Agent Discovery:** Identifies promising ATP agents.
3. **Investment Decision:** Selects the best agent and amount to invest.
4. **Investment Execution:** Buys the agent and records the transaction.
5. **Notification:** Sends a summary to your Telegram channel.

## Prerequisites

- Node.js (v18+ recommended)
- pnpm (package manager)
- IQAI wallet with IQ tokens
- Access to OpenAI or Google Gemini LLM API (for LLM_MODEL)
- (Optional) Telegram bot credentials for notifications

## Installation

```bash
pnpm install
```

## Configuration

Copy the example environment file and fill in your credentials:

```bash
cp example.env .env
```

Edit `.env` with your wallet, LLM, and (optionally) Telegram details:

```env
LLM_MODEL=gemini-2.0-flash
WALLET_PRIVATE_KEY=your_private_key
ATP_USE_DEV=true
ATP_API_KEY=your_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_SERVER_KEY=your_telegram_server_key
TELEGRAM_PROFILE_ID=your_telegram_profile_id
ATP_INVESTMENT_PERCENTAGE=0.01
ATP_MIN_INVESTMENT=10
ATP_CRON_SCHEDULE="0 */3 * * *"
```

## Development

- **Development mode (with auto-reload):**  
  `pnpm dev`
- **Build the project:**  
  `pnpm build`
- **Clean build artifacts:**  
  `pnpm clean`

## Running the Agent

First, build the project:

```bash
pnpm build
```

Then run:

- **Run once:**  
  `pnpm start:once`
- **Run on schedule (default: every 3 hours):**  
  `pnpm start`

## Environment Variables

See `example.env` for all options. Key variables:

- `LLM_MODEL`: LLM to use (e.g., `gemini-2.0-flash`)
- `WALLET_PRIVATE_KEY`: Your IQAI wallet private key
- `ATP_INVESTMENT_PERCENTAGE`: % of IQ balance to invest per cycle
- `ATP_MIN_INVESTMENT`: Minimum investment amount
- `ATP_CRON_SCHEDULE`: Cron schedule for agent runs
- Telegram variables for notifications

## Project Structure

- `agents/` – Specialized agents for each workflow step
- `services/` – Wallet management and validation
- `utils/` – Utility functions
- `atp-investment-agent.ts` – Main workflow class
- `index.ts` – Entry point and scheduler
- `dist/` – Compiled JavaScript output

## Security

- **Never share your wallet private key.**
- Use environment variables and `.env` files for sensitive data.

## License

MIT
