import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getNlReference, proxyQuery } from "./proxy.js";

const queryParam = { query: z.string().describe("Raw XQL query text") };

export function buildServer(apiKey: string): McpServer {
  const server = new McpServer(
    { name: "xcreener-xql", version: "1.0.0" },
    {
      instructions:
        "Before writing an XQL query, read the xql_nl_reference resource (xql://nl-reference) via resources/read — it maps natural-language trading phrases to valid XQL syntax and documents hard limits (300-bar lookback ceiling, closed market/timeframe enums, the atr no-source-argument exception, etc.). Always call xql_validate on the query before calling xql_run: xql_validate parses and plans without touching live data, so it catches syntax errors before xql_run wastes a live-data round trip on a query that was always going to fail. If xql_validate, xql_explain, or xql_run returns isError: true for a query you generated, re-read xql://nl-reference before retrying — it documents the exact construct you likely got wrong.",
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

  server.registerResource(
    "xql_nl_reference",
    "xql://nl-reference",
    {
      description:
        "Reference document for translating retail-trader natural language into XQL and paraphrasing XQL results back into plain language.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: await getNlReference(apiKey) }],
    })
  );

  server.registerPrompt(
    "translate_query",
    {
      title: "Translate a plain-English query into XQL",
      description:
        "Loads the XQL natural-language translation reference and asks for a trader's plain-English screening request to be translated into a valid XQL query, ready to check with xql_validate before calling xql_run.",
      argsSchema: {
        humanQuery: z
          .string()
          .describe('The trader\'s plain-English screening request, e.g. "oversold cryptos with rising volume".'),
      },
    },
    async ({ humanQuery }) => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: await getNlReference(apiKey) },
        },
        {
          role: "user",
          content: {
            type: "text",
            text: `Using the reference above, translate this into a valid XQL query, then call xql_validate before xql_run: "${humanQuery}"`,
          },
        },
      ],
    })
  );

  return server;
}
