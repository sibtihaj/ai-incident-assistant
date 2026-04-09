import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const nexsevRoot = process.cwd();
const workspaceRoot = path.resolve(nexsevRoot, "..");

// Load .env* from workspace root first, then nexsev (app dir wins on duplicate keys).
// Supports .env.local at repo root or in nexsev/ when running `next dev` from nexsev.
loadEnvConfig(workspaceRoot);
loadEnvConfig(nexsevRoot);

const nextConfig: NextConfig = {
  // App directory as tracing root when another lockfile exists higher in the tree.
  outputFileTracingRoot: nexsevRoot,
  // Bounded next/image disk cache (CVE-2026-27980); LRU eviction when over limit.
  images: {
    maximumDiskCacheSize: 500_000_000,
  },
};

export default nextConfig;
