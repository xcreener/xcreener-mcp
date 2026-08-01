# @xcreener/mcp

[![npm version](https://img.shields.io/npm/v/@xcreener/mcp.svg)](https://www.npmjs.com/package/@xcreener/mcp)
[![license](https://img.shields.io/npm/l/@xcreener/mcp.svg)](LICENSE)

Local stdio MCP bridge for XCREENER's XQL screener API — validate, explain, and run XQL queries from Claude Desktop, Cursor, Windsurf, or any stdio MCP client.

## About XCREENER

[XCREENER](https://xcreener.com) is a market screener that scans Crypto, Forex, Indices, Commodities, and Metals simultaneously, so you don't have to check charts one at a time. It's built for beginner traders through ready-made screeners as well as for developers and AI agents, who can express custom conditions in XCREENER Query Language (XQL) and run them instantly via a REST API or MCP. Learn more at [xcreener.com](https://xcreener.com).

## What this MCP server does

This package is the local stdio bridge to XCREENER's XQL API specifically. It exposes `xql_validate`, `xql_explain`, and `xql_run` as MCP tools, so any stdio MCP client can check and execute XQL screens against live market data without you writing any HTTP glue code.

## Installation

### Claude Desktop (`.mcpb`)

Download the latest `xcreener.mcpb` from this repo's [Releases](https://github.com/xcreener/xcreener-mcp/releases) page and drag it into **Claude Desktop → Settings → Extensions**. You'll be prompted for your API key.

### Other MCP clients (npx)

Add this to your client's MCP server config (e.g. Cursor, Windsurf, Claude Code):

```json
{
  "mcpServers": {
    "xcreener": {
      "command": "npx",
      "args": ["-y", "@xcreener/mcp"],
      "env": { "XCREENER_API_KEY": "your-api-key" }
    }
  }
}
```

### From source

```bash
git clone https://github.com/xcreener/xcreener-mcp.git
cd xcreener-mcp
npm install
npm run build
```

Then point your client at `node dist/index.js` with `XCREENER_API_KEY` set in its environment.

## Configuration

| Variable           | Required | Description                                                                                       |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `XCREENER_API_KEY` | Yes      | Your XCREENER API key, from [xcreener.com/account/api-key](https://xcreener.com/account/api-key). |

The key is checked lazily — an invalid or missing key won't stop the server from starting, it'll just surface as an `auth` error the first time a tool is called.

## Available tools, resources, and prompts

| Name                 | Type     | Description                                                                                     |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `xql_validate`       | Tool     | Validate XQL query text by parsing and planning it, without executing it against live data.     |
| `xql_explain`        | Tool     | Parse and plan an XQL query, returning its execution plan and a human-readable explanation.     |
| `xql_run`            | Tool     | Parse, plan, and execute an XQL query against live market data, returning matching instruments. |
| `xql://nl-reference` | Resource | Reference document mapping natural-language trading phrases to XQL syntax.                      |
| `translate_query`    | Prompt   | Translates a plain-English screening request into XQL, ready to validate and run.               |

## Example session

Under the hood, the assistant reads the `xql://nl-reference` resource, translates your plain-English ask into an XQL query, and calls `xql_validate`/`xql_run` — what you see is just the human-visible conversation. A few real examples:

**Multi-market screen**

> **You:** check all markets and see which instruments are oversold at the moment
>
> **XCREENER:** - xql_run (MCP)(query: "market = \"CRYPTO\"\ntimeframe = h1\ncolumns = [rsi(14)]\nsort = rsi(14) asc\nrsi(14) < 30")
> **XCREENER:** - xql_run (MCP)(query: "market = \"FOREX\"\ntimeframe = h1\ncolumns = [rsi(14)]\nsort = rsi(14) asc\nrsi(14) < 30")
> **XCREENER:** - xql_run (MCP)(query: "market = \"INDICES\"\ntimeframe = h1\ncolumns = [rsi(14)]\nsort = rsi(14) asc\nrsi(14) < 30")
> **XCREENER:** - xql_run (MCP)(query: "market = \"METALS\"\ntimeframe = h1\ncolumns = [rsi(14)]\nsort = rsi(14) asc\nrsi(14) < 30")
> **XCREENER:** - xql_run (MCP)(query: "market = \"COMMODITIES\"\ntimeframe = h1\ncolumns = [rsi(14)]\nsort = rsi(14) asc\nrsi(14) < 30")
> **XCREENER:** Oversold (RSI(14) < 30, hourly) across all markets:
>
> | Market      | Symbol   | RSI(14) |
> | ----------- | -------- | ------- |
> | Crypto      | BTCUSDT  | 26.3    |
> | Crypto      | ETHUSDT  | 27.5    |
> | Crypto      | XRPUSDT  | 28.0    |
> | Commodities | WHEATUSD | 21.0    |
> | Commodities | CORNUSD  | 22.6    |
>
> Forex, Indices, and Metals had no oversold matches.

**Single-market snapshot**

> **You:** can you give me updates on how the metals are doing?
>
> **XCREENER:** - xql_run (MCP)(query: "market = \"METALS\"\ntimeframe = h1\nlet uptrend = close > sma(50)\ncolumns = [close, roc(1), rsi(14), uptrend]\nsort = roc(1) desc\nclose > 0")
> **XCREENER:** Metals snapshot, hourly:
>
> | Symbol            | Close    | 1h ROC | RSI(14) | Trend (vs SMA50) |
> | ----------------- | -------- | ------ | ------- | ---------------- |
> | XPTUSD (Platinum) | 1,637.98 | +0.03% | 54.8    | Uptrend          |
> | XAGUSD (Silver)   | 57.48    | +0.02% | 38.6    | Downtrend        |
> | XAUUSD (Gold)     | 4,043.69 | +0.01% | 41.0    | Downtrend        |
>
> Overall: fairly quiet, no oversold/overbought extremes (all RSI 38–55). Platinum's the strongest — up-trending with the best momentum — while gold and silver are drifting below their 50-hour average.

**Cross-pair aggregate analysis**

> **You:** which currency is the weakest and strongest?
>
> **XCREENER** - xql_run (MCP)(query: "market = \"FOREX\"\ntimeframe = h1\ncolumns = [close, roc(1)]\nsort = roc(1) desc\nclose > 0")
> **XCREENER:** Based on the 1h ROC across all 28 pairs (aggregating each currency's average move against the other seven):
>
> | Rank          | Currency | Avg 1h Strength |
> | ------------- | -------- | --------------- |
> | 1 (strongest) | CHF      | +0.0414%        |
> | 2             | JPY      | +0.0184%        |
> | ...           |          |                 |
> | 8 (weakest)   | USD      | -0.0421%        |
>
> **Strongest: CHF** — up against every other major this hour. **Weakest: USD** — sold broadly against EUR, GBP, AUD, JPY, and CHF alike.

**Actionable trade plan**

> **You:** NZD looks like the strongest currency this week — which pair should I long based on that, and what stop-loss/take-profit levels make sense?
>
> **XCREENER:** - xql_run (MCP)(query: "market = \"FOREX\"\ntimeframe = h1\nsymbols = [\"NZDUSD\"]\ncolumns = [close, atr(14), sma(50), highest(high, 20), lowest(low, 20), w::lowest(low, 52), rsi(14)]\nclose > 0")
> **XCREENER:** **Idea: Long NZDUSD** — the cleanest multi-timeframe confluence: NZD is the #2 strongest currency of the week, daily is non-conflicting, and hourly shows an uptrend (close 0.5881 > SMA(50) 0.5846) with bullish-but-not-overbought momentum (RSI(14) 60.8).
>
> |           | Level   | Rationale                                           |
> | --------- | ------- | --------------------------------------------------- |
> | Entry     | ~0.5881 | Current price                                       |
> | Stop Loss | 0.5845  | Below the 20h swing low and h1 SMA(50); ~3× ATR(14) |
> | TP1       | 0.5940  | ~1.6:1 R:R, partial scale-out                       |
> | TP2       | 0.6093  | Weekly 52-week high, ~5.9:1 R:R                     |
>
> _Not financial advice — a technical read off the pulled data; confirm against execution/spread costs before entering._

## Development

```bash
npm run dev         # tsup --watch
npm run build        # build dist/index.js
npm run build:mcpb   # build + pack dist-mcpb/xcreener.mcpb
npm run lint
npm run typecheck
```

The build produces a single bundled ESM file (`dist/index.js`) with all dependencies inlined via tsup, so both the npm package and the `.mcpb` bundle ship without `node_modules`.

## License

MIT — see [LICENSE](LICENSE).
