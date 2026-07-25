#!/usr/bin/env node
/**
 * Build password-protected time-capsule PDF for kasuminomori-shougakkou.
 * Requires: python 3 + fpdf2 + pypdf (pip install fpdf2 pypdf)
 */
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pyScript = path.join(__dirname, "build-time-capsule-pdf.py")

const py = process.platform === "win32" ? "python" : "python3"
const r = spawnSync(py, [pyScript], { stdio: "inherit", encoding: "utf8" })

if (r.status !== 0) {
  console.error(
    "[build-time-capsule-pdf] Failed. Install deps: pip install fpdf2 pypdf",
  )
  process.exit(r.status ?? 1)
}
