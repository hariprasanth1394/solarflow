/**
 * Verifies AppSpinner CSS rotation in Chromium (desktop/Android engine)
 * and WebKit if available. Exits non-zero when animation is frozen.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium, webkit } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cssPath = join(__dirname, "../src/styles/globals.css")
const cssSource = readFileSync(cssPath, "utf8")

function extractSpinnerCss(source) {
  const start = source.indexOf(".sf-spinner {")
  const end = source.indexOf("@keyframes sf-modal-busy-spin {")
  if (start === -1 || end === -1) throw new Error("Could not extract spinner CSS from globals.css")
  return source.slice(start, end)
}

async function readRotorAngle(page, testId) {
  return page.$eval(`[data-testid="${testId}"] .sf-spinner__rotor`, (el) => {
    const style = window.getComputedStyle(el)
    const transform = style.transform
    const rotate = style.rotate
    if (rotate && rotate !== "none" && rotate.endsWith("deg")) {
      return Number.parseFloat(rotate)
    }
    if (!transform || transform === "none") return 0
    const values = transform
      .match(/matrix\(([^)]+)\)/)?.[1]
      ?.split(",")
      .map((part) => Number.parseFloat(part.trim()))
    if (!values || values.length < 2) return null
    return (Math.atan2(values[1], values[0]) * 180) / Math.PI
  })
}

const spinnerCss = extractSpinnerCss(cssSource)

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; font-family: sans-serif; background: #fff; }
    .case { padding: 24px; }
    .transformed-parent { transform: translateY(0) scale(1); }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.96);
    }
    .host { position: relative; width: 320px; height: 240px; border: 1px solid #e2e8f0; }
    ${spinnerCss}
  </style>
</head>
<body>
  <div class="case">
    <h3>plain</h3>
    <span class="sf-spinner sf-spinner--lg" data-testid="plain">
      <span class="sf-spinner__rotor" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle class="sf-spinner__track" cx="12" cy="12" r="9.5" />
          <path class="sf-spinner__arc" d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" />
        </svg>
      </span>
    </span>
  </div>
  <div class="case transformed-parent">
    <h3>inside transformed parent</h3>
    <span class="sf-spinner sf-spinner--lg" data-testid="transformed">
      <span class="sf-spinner__rotor" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle class="sf-spinner__track" cx="12" cy="12" r="9.5" />
          <path class="sf-spinner__arc" d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" />
        </svg>
      </span>
    </span>
  </div>
  <div class="case">
    <h3>inside overlay</h3>
    <div class="host">
      <div class="overlay sf-modal-busy-overlay">
        <span class="sf-spinner sf-spinner--lg" data-testid="overlay">
          <span class="sf-spinner__rotor" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle class="sf-spinner__track" cx="12" cy="12" r="9.5" />
              <path class="sf-spinner__arc" d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" />
            </svg>
          </span>
        </span>
      </div>
    </div>
  </div>
</body>
</html>`

async function readRotorTransform(page, testId) {
  return page.$eval(
    `[data-testid="${testId}"] .sf-spinner__rotor`,
    (el) => {
      const style = window.getComputedStyle(el)
      return {
        transform: style.transform,
        rotate: style.rotate,
        animationName: style.animationName,
      }
    }
  )
}

async function launchBrowser(browserType, label) {
  try {
    return { browser: await browserType.launch({ headless: true }), label }
  } catch {
    return { browser: await chromium.launch({ channel: "chrome", headless: true }), label: `${label} (system Chrome)` }
  }
}

async function assertSpinnerRotates(browserName, browserType) {
  const { browser, label } = await launchBrowser(browserType, browserName)
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "load" })
  await page.waitForTimeout(50)

  const cases = ["plain", "transformed", "overlay"]
  const failures = []

  for (const testId of cases) {
    await page.waitForTimeout(80)
    const first = await readRotorAngle(page, testId)
    await page.waitForTimeout(320)
    const second = await readRotorAngle(page, testId)
    const meta = await readRotorTransform(page, testId)

    const delta = first !== null && second !== null ? Math.abs(second - first) : 0
    const rotated = delta > 20

    if (!rotated) {
      failures.push(
        `${label}/${testId}: angle ${first}→${second} (animation: ${meta.animationName}, transform: ${meta.transform}, rotate: ${meta.rotate})`
      )
    } else {
      console.log(`✓ ${label}/${testId}: ${first?.toFixed(1)}° → ${second?.toFixed(1)}°`)
    }
  }

  await browser.close()
  return failures
}

const allFailures = []
let ran = 0

try {
  const failures = await assertSpinnerRotates("chromium", chromium)
  allFailures.push(...failures)
  ran += 1
} catch (error) {
  console.warn("Chromium test skipped:", error instanceof Error ? error.message : error)
}

try {
  const failures = await assertSpinnerRotates("webkit", webkit)
  allFailures.push(...failures)
  ran += 1
} catch (error) {
  console.warn("WebKit test skipped:", error instanceof Error ? error.message : error)
}

if (ran === 0) {
  console.error("No browsers available for spinner animation verification. Install Playwright browsers or Google Chrome.")
  process.exit(1)
}

if (allFailures.length > 0) {
  console.error("\nSpinner animation verification failed:")
  for (const failure of allFailures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log("\nAll spinner animation checks passed.")
