import { DEFAULT_GATEWAY_MODEL_ID } from "@/lib/ai/constants";

/** OpenAI-compatible HTTP base (e.g. LangChain `baseURL`) — chat completions under `/v1/chat/completions`. */
const DEFAULT_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
/**
 * Vercel AI SDK `@ai-sdk/gateway` expects the provider base including `/v1/ai` (not the same as OpenAI-compat `/v1` alone).
 * @see https://vercel.com/docs/ai-gateway
 */
const DEFAULT_AI_SDK_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1/ai";

const DEFAULT_MODEL = DEFAULT_GATEWAY_MODEL_ID;
const DEFAULT_TEMPERATURE = 0.2;

function firstNonEmptyTrimmed(
  ...candidates: (string | undefined)[]
): string | undefined {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

export interface AIConfig {
  gatewayBaseUrl: string;
  gatewayToken: string;
  model: string;
  temperature: number;
}

/**
 * Base URL for `createGateway()` from the Vercel AI SDK (`ai` package).
 * If `AI_GATEWAY_BASE_URL` is set to the OpenAI-style `.../v1`, we append `/ai` so the gateway provider routes correctly.
 */
export function getAiSdkGatewayBaseUrl(): string {
  const raw = process.env.AI_GATEWAY_PROVIDER_BASE_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  const legacy = process.env.AI_GATEWAY_BASE_URL?.trim();
  if (!legacy) {
    return DEFAULT_AI_SDK_GATEWAY_BASE_URL;
  }
  const normalized = legacy.replace(/\/$/, "");
  if (normalized.endsWith("/v1/ai")) {
    return normalized;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/ai`;
  }
  return DEFAULT_AI_SDK_GATEWAY_BASE_URL;
}

/**
 * Resolves the Vercel AI Gateway token.
 * Local: set `AI_GATEWAY_API_KEY` in `nexsev/.env.local` (or repo-root `.env.local`).
 * Vercel: prefer `VERCEL_OIDC_TOKEN` when using OIDC; otherwise use the dashboard API key.
 *
 * Precedence (first non-empty wins): `AI_GATEWAY_API_KEY` → `VERCEL_AI_GATEWAY_API_KEY` → `VERCEL_OIDC_TOKEN`.
 * If both generic and Vercel-named keys are set, the generic key wins — remove or fix a stale `AI_GATEWAY_API_KEY` if the gateway still rejects requests.
 */
export function getAIConfig(): AIConfig {
  const gatewayToken = firstNonEmptyTrimmed(
    process.env.AI_GATEWAY_API_KEY,
    process.env.VERCEL_AI_GATEWAY_API_KEY,
    process.env.VERCEL_AI_GATEWAY_API,
    process.env.VERCEL_OIDC_TOKEN
  );

  if (!gatewayToken) {
    throw new Error(
      "Missing AI Gateway credentials. Add AI_GATEWAY_API_KEY to .env.local (in the nexsev folder or repo root), or set VERCEL_AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN."
    );
  }

  const model = process.env.AI_GATEWAY_MODEL?.trim() || DEFAULT_MODEL;
  const gatewayBaseUrl =
    process.env.AI_GATEWAY_BASE_URL?.trim() || DEFAULT_GATEWAY_BASE_URL;

  if (!model.includes("/")) {
    throw new Error(
      `Invalid AI_GATEWAY_MODEL "${model}". Use provider/model format, for example "${DEFAULT_GATEWAY_MODEL_ID}".`
    );
  }

  return {
    gatewayBaseUrl,
    gatewayToken,
    model,
    temperature: DEFAULT_TEMPERATURE,
  };
}
