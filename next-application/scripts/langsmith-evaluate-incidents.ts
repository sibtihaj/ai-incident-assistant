/**
 * Runs a LangSmith experiment: dataset examples → Vercel AI Gateway (generateText) → simple keyword eval.
 *
 * Usage (from `next-application/`):
 *   npx tsx scripts/langsmith-evaluate-incidents.ts
 *
 * Prereqs:
 *   - Gateway env: AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN), AI_GATEWAY_MODEL
 *   - LangSmith: LANGSMITH_API_KEY, LANGSMITH_TRACING=true (optional for experiment traces)
 *   - Dataset: run `npx tsx scripts/langsmith-seed-incident-dataset.ts` first
 */
import { createGateway, generateText } from "ai";
import { evaluate } from "langsmith/evaluation";
import { Client, type Example, type Run } from "langsmith";

import { getAIConfig, getAiSdkGatewayBaseUrl } from "../lib/ai/config";
import { loadEnvLocal } from "./load-env-local";

const DEFAULT_DATASET = "ib-ai-incident-playground";

async function main(): Promise<void> {
  loadEnvLocal();
  const apiKey = process.env.LANGSMITH_API_KEY ?? process.env.LANGCHAIN_API_KEY;
  if (!apiKey?.trim()) {
    console.error("Set LANGSMITH_API_KEY (or LANGCHAIN_API_KEY) in .env.local");
    process.exit(1);
  }

  const resolvedDataset = process.env.LANGSMITH_INCIDENT_DATASET?.trim() || DEFAULT_DATASET;

  const client = new Client({ apiKey });
  const hasDataset = await client.hasDataset({ datasetName: resolvedDataset });
  if (!hasDataset) {
    console.error(
      `Dataset "${resolvedDataset}" not found. Run: npx tsx scripts/langsmith-seed-incident-dataset.ts`
    );
    process.exit(1);
  }

  const aiConfig = getAIConfig();
  const gatewayProvider = createGateway({
    apiKey: aiConfig.gatewayToken,
    baseURL: getAiSdkGatewayBaseUrl(),
  });
  const model = gatewayProvider(aiConfig.model);

  const target = async (input: { message: string }) => {
    const result = await generateText({
      model,
      system:
        "You are IB AI Assistant for Sev1 incident workflows. Be concise and professional.",
      prompt: input.message,
      temperature: aiConfig.temperature,
    });
    return { answer: result.text };
  };

  const result = await evaluate(target, {
    client,
    data: resolvedDataset,
    experimentPrefix: "ib-ai-incident-portfolio",
    description: "Keyword grounding smoke eval over incident-style prompts (Vercel AI Gateway).",
    maxConcurrency: 1,
    evaluators: [
      async (args: {
        run: Run;
        example: Example;
        inputs: Record<string, unknown>;
        outputs: Record<string, unknown>;
        referenceOutputs?: Record<string, unknown>;
      }) => {
        const { outputs, referenceOutputs } = args;
        const text = String(outputs.answer ?? "");
        const must =
          referenceOutputs && typeof referenceOutputs.mustContain === "string"
            ? referenceOutputs.mustContain
            : "";
        const score =
          !must || text.toLowerCase().includes(must.toLowerCase()) ? 1 : 0;
        return {
          key: "must_contain_reference",
          score,
          comment:
            score === 1
              ? "Output contains expected substring from dataset reference."
              : `Expected substring "${must}" not found in model output.`,
        };
      },
    ],
  });

  let rowCount = 0;
  for await (const row of result) {
    rowCount += 1;
    console.log(`Row ${rowCount}:`, row.evaluationResults);
  }
  console.log(`Experiment "${result.experimentName}" complete. Rows: ${rowCount}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
