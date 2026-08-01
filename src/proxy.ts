const BASE_URL = "https://api.xcreener.com";

export type XqlErrorBody = {
  type: "syntax" | "plan";
  message: string;
  position?: { line: number; column: number; offset: number };
};

export type ToolErrorBody =
  | XqlErrorBody
  | { type: "auth" | "rate_limited" | "server" | "network"; message: string };

export const REFERENCE_HINT =
  "See the xql_nl_reference resource (xql://nl-reference) for correct syntax before retrying.";

export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(error: ToolErrorBody, includeHint: boolean) {
  const content = [{ type: "text" as const, text: JSON.stringify({ error }) }];
  if (includeHint) content.push({ type: "text" as const, text: REFERENCE_HINT });
  return { isError: true as const, content };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isXqlErrorBody(value: unknown): value is XqlErrorBody {
  return isRecord(value) && (value.type === "syntax" || value.type === "plan") && typeof value.message === "string";
}

async function mapErrorResponse(response: Response): Promise<ToolErrorBody> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const errorField = isRecord(body) ? body.error : undefined;

  if (response.status === 400 && isXqlErrorBody(errorField)) {
    return errorField;
  }

  const message = typeof errorField === "string" ? errorField : `Unexpected ${response.status} response from the API`;

  if (response.status === 401) {
    return { type: "auth", message };
  }

  if (response.status === 429) {
    const resetAt = response.headers.get("X-RateLimit-Reset");
    return { type: "rate_limited", message: resetAt ? `${message} Resets at ${resetAt}.` : message };
  }

  return { type: "server", message };
}

export async function proxyQuery(path: string, query: string, apiKey: string) {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: query,
    });
  } catch {
    return errorResult({ type: "network", message: `Failed to reach ${BASE_URL} — check your network connection.` }, false);
  }

  if (response.ok) {
    return textResult(await response.text());
  }

  const error = await mapErrorResponse(response);
  const includeHint = error.type === "syntax" || error.type === "plan";
  return errorResult(error, includeHint);
}

let cachedNlReference: string | null = null;

export async function getNlReference(apiKey: string): Promise<string> {
  if (cachedNlReference !== null) {
    return cachedNlReference;
  }

  const response = await fetch(`${BASE_URL}/xql/nl-reference`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch xql://nl-reference (${response.status})`);
  }

  cachedNlReference = await response.text();
  return cachedNlReference;
}
