/**
 * Creates (or reuses) a LangSmith dataset with representative incident-playground examples.
 *
 * Usage (from `next-application/`):
 *   npx tsx scripts/langsmith-seed-incident-dataset.ts
 *
 * Requires: LANGSMITH_API_KEY (or LANGCHAIN_API_KEY), optional LANGSMITH_INCIDENT_DATASET
 */
import { Client } from "langsmith";

import { loadEnvLocal } from "./load-env-local";

const DEFAULT_DATASET = "ib-ai-incident-playground";

async function hasAnyExample(client: Client, datasetName: string): Promise<boolean> {
  for await (const _ of client.listExamples({ datasetName, limit: 1 })) {
    return true;
  }
  return false;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const apiKey = process.env.LANGSMITH_API_KEY ?? process.env.LANGCHAIN_API_KEY;
  if (!apiKey?.trim()) {
    console.error("Set LANGSMITH_API_KEY (or LANGCHAIN_API_KEY) in .env.local");
    process.exit(1);
  }

  const datasetName = process.env.LANGSMITH_INCIDENT_DATASET?.trim() || DEFAULT_DATASET;
  const client = new Client({ apiKey });

  let dataset = await client.readDataset({ datasetName }).catch(() => null);
  if (!dataset) {
    dataset = await client.createDataset(datasetName, {
      description:
        "IB AI Assistant — incident triage prompts for offline evaluation (portfolio).",
    });
    console.log(`Created dataset: ${datasetName} (${dataset.id})`);
  } else {
    console.log(`Using existing dataset: ${datasetName} (${dataset.id})`);
  }

  const datasetId = dataset.id;

  if (await hasAnyExample(client, datasetName)) {
    console.log("Dataset already has examples; skip upload (delete examples in LangSmith to re-seed).");
    return;
  }

  const uploads = [
    {
      dataset_id: datasetId,
      inputs: { message: "What does a Sev1 incident response workflow look like for our team?" },
      outputs: { mustContain: "incident" },
      metadata: { category: "conversational_glossary" },
    },
    {
      dataset_id: datasetId,
      inputs: {
        message:
          "Customer: Acme. Severity: SEV1. Status: investigating. Impact: checkout down. Draft a short status update.",
      },
      outputs: { mustContain: "investigat" },
      metadata: { category: "incident_update" },
    },
    {
      dataset_id: datasetId,
      inputs: {
        message:
          "I need to log a new incident. Customer: Contoso. Description: API timeouts in us-east. Severity: SEV2. Status: investigating.",
      },
      outputs: { mustContain: "incident" },
      metadata: { category: "create_incident_intent" },
    },
  ];

  await client.createExamples(uploads);
  console.log(`Uploaded ${uploads.length} examples to ${datasetName}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
