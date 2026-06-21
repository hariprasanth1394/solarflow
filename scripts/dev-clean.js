#!/usr/bin/env node
/**
 * Kills stale Next.js dev processes, removes the Next.js dev lock, then starts the dev server.
 * Cross-platform replacement / macOS / Linux / Windows ).
 */
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const root = path.join(__dirname, "..");
const lockPath = path.join(root, ".next", "dev", "lock");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopNextDevProcesses() {
  try {
    if (process.platform === "win32") {
      execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'next dev' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "inherit" }
      );
    } else {
      execSync("pkill -f 'next dev' 2>/dev/null || true", {
        stdio: "inherit",
        shell: true,
      });
    }
    console.log("Stopping existing next dev processes...");
  } catch {
    // No matching processes.
  }
}

function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
      });
      const lines = out.split("\n").filter((line) => line.includes("LISTENING"));
      for (const line of lines) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && pid !== "0") {
          console.log(`Freeing port ${port} (PID ${pid})...`);
          execSync(`taskkill /PID ${pid} /F`, { stdio: "inherit" });
        }
      }
    } else {
      const pid = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
      if (pid) {
        console.log(`Freeing port ${port} (PID ${pid})...`);
        execSync(`kill -9 ${pid.split("\n").join(" ")}`, { stdio: "inherit" });
      }
    }
  } catch {
    // Port not in use.
  }
}

function removeLock() {
  if (!fs.existsSync(lockPath)) return;

  try {
    fs.unlinkSync(lockPath);
    console.log("Removed stale Next.js dev lock.");
  } catch {
    try {
      fs.unlinkSync(lockPath);
      console.log("Removed stale Next.js dev lock.");
    } catch {
      // Lock may still be held by another process.
    }
  }
}

async function main() {
  stopNextDevProcesses();
  await sleep(750);
  freePort(PORT);
  await sleep(400);
  removeLock();
  await sleep(250);

  console.log(`Starting Next.js dev server on port ${PORT}...`);
  const child = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
