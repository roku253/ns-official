import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, "..")
const briefingJsonPath = path.join(root, "games", "signal-trace", "cases", "koko-ni-iru", "initial-hq-briefing.json")
const gasPath = path.resolve(root, "..", "apps-script", "reference-code.gs.txt")

const briefing = JSON.parse(fs.readFileSync(briefingJsonPath, "utf8"))
let gas = fs.readFileSync(gasPath, "utf8")

function toSingleQuotedJs(str) {
  return `'${String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}

const subjectLine = `      subject: ${toSingleQuotedJs(briefing.subject)},`
const senderLine = `      senderName: ${toSingleQuotedJs(briefing.senderName)},`
const storyLinesBlock =
  "      storyLines: [\n" +
  briefing.storyLines.map((line) => `        ${toSingleQuotedJs(line)}`).join(",\n") +
  "\n      ],"

const rl = briefing.requestLetter
const requestLetterFileNameLine = `      requestLetterFileName: ${toSingleQuotedJs(rl?.fileName || "依頼文.txt")},`
const requestLetterLinesBlock =
  "      requestLetterLines: [\n" +
  (rl?.lines ?? []).map((line) => `        ${toSingleQuotedJs(line)}`).join(",\n") +
  "\n      ],"

gas = gas.replace(/^\s{6}subject:\s*.*$/m, subjectLine)
gas = gas.replace(/^\s{6}senderName:\s*.*$/m, senderLine)
gas = gas.replace(/^\s{6}storyLines:\s*\[[\s\S]*?^\s{6}\],$/m, storyLinesBlock)
gas = gas.replace(/^\s{6}requestLetterFileName:\s*.*$/m, requestLetterFileNameLine)
gas = gas.replace(/^\s{6}requestLetterLines:\s*\[[\s\S]*?^\s{6}\],$/m, requestLetterLinesBlock)

fs.writeFileSync(gasPath, gas, "utf8")
console.log("Synced initial HQ briefing to apps-script/reference-code.gs.txt")
