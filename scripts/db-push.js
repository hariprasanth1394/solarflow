#!/usr/bin/env node
/**
 * Push local Supabase migrations to the linked remote project.
 *
 * Required in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_PROJECT_ID
 *   SUPABASE_ACCESS_TOKEN  (Personal Access Token — NOT the anon key)
 *
 * Create a token: https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   node scripts/db-push.js
 */

const { spawnSync } = require("node:child_process")
const { existsSync, readFileSync } = require("node:fs")
const path = require("node:path")

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

const root = path.resolve(__dirname, "..")
loadEnvFile(path.join(root, ".env.local"))

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_PROJECT_ID"]
const missing = required.filter((key) => !process.env[key])
if (missing.length) {
  console.error(`Missing required env vars in .env.local: ${missing.join(", ")}`)
  process.exit(1)
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    [
      "SUPABASE_ACCESS_TOKEN is not set in .env.local.",
      "",
      "Create a Personal Access Token at:",
      "  https://supabase.com/dashboard/account/tokens",
      "",
      "Then add to .env.local:",
      "  SUPABASE_ACCESS_TOKEN=sbp_...",
    ].join("\n")
  )
  process.exit(1)
}

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error(
    [
      "SUPABASE_DB_PASSWORD is not set in .env.local.",
      "",
      "Find it in Supabase Dashboard:",
      "  Project Settings → Database → Database password",
      "",
      "Then add to .env.local:",
      "  SUPABASE_DB_PASSWORD=your_database_password",
      "",
      "Re-run: npm run db:push",
    ].join("\n")
  )
  process.exit(1)
}

const projectRef = process.env.SUPABASE_PROJECT_ID

console.log(`Linking project ${projectRef}...`)
const link = spawnSync("supabase", ["link", "--project-ref", projectRef, "--yes"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

if (link.status !== 0) {
  process.exit(link.status ?? 1)
}

console.log("Pushing migrations...")
const push = spawnSync("supabase", ["db", "push", "--linked", "--password", process.env.SUPABASE_DB_PASSWORD], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

process.exit(push.status ?? 1)
