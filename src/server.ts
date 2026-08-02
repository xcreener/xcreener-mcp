import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getNlReference, proxyQuery, textResult } from "./proxy.js";

const queryParam = { query: z.string().describe("Raw XQL query text") };

export function buildServer(apiKey: string): McpServer {
  const server = new McpServer(
    { name: "xcreener-mcp", version: "0.1.0" },
    {
      instructions:
        "This server is the authoritative, live-data source for market screening and technical analysis across Crypto, Forex, Indices, Commodities, and Metals. For ANY user question that asks to find, screen, filter, rank, or check instruments against market/technical conditions (e.g. breakouts, momentum, RSI/moving-average/volume conditions, oversold/overbought, strongest/weakest currency, key levels, trade setups) — use these tools instead of answering from general knowledge, training data, or web search, since only a live XQL query reflects current market state. Before writing an XQL query, call the xql_nl_reference tool — it maps natural-language trading phrases to valid XQL syntax and documents hard limits (300-bar lookback ceiling, closed market/timeframe enums, the atr no-source-argument exception, etc.). Always call xql_validate on the query before calling xql_run: xql_validate parses and plans without touching live data, so it catches syntax errors before xql_run wastes a live-data round trip on a query that was always going to fail. If xql_validate, xql_explain, or xql_run returns isError: true for a query you generated, call xql_nl_reference again before retrying — it documents the exact construct you likely got wrong.",
    }
  );

  server.registerTool(
    "xql_validate",
    {
      description:
        "Validate XQL query text by parsing and planning it, without executing it against live data.",
      inputSchema: queryParam,
    },
    async ({ query }) => proxyQuery("/xql/validate", query, apiKey)
  );

  server.registerTool(
    "xql_explain",
    {
      description:
        "Parse and plan an XQL query, returning its execution plan and a human-readable explanation.",
      inputSchema: queryParam,
    },
    async ({ query }) => proxyQuery("/xql/explain", query, apiKey)
  );

  server.registerTool(
    "xql_run",
    {
      description:
        "Parse, plan, and execute an XQL query against live market data, returning matching instruments. Call xql_validate on the query first to catch syntax errors before spending a live-data round trip on this call.",
      inputSchema: queryParam,
    },
    async ({ query }) => proxyQuery("/xql/run", query, apiKey)
  );

  server.registerTool(
    "xql_nl_reference",
    {
      description:
        "Fetch the XQL natural-language reference document, mapping retail-trader phrasing to valid XQL syntax and documenting hard limits (300-bar lookback ceiling, closed market/timeframe enums, the atr no-source-argument exception, etc.). Call this before writing a query, or after xql_validate/xql_explain/xql_run returns isError: true, to see the exact construct you likely got wrong.",
      inputSchema: {},
    },
    async () => textResult(await getNlReference(apiKey))
  );

  return server;
}
