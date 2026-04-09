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
  /* config options here */
};

export default nextConfig;
