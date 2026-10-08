/**
 * 許可外 action が 4xx 判定になることを node で確認する。
 * GAS には接続しない。実行: node --experimental-strip-types scripts/check-gas-proxy-allowlist.mjs
 */
import { decideGasProxyForward } from "../lib/gas-proxy-policy.ts"

const denied = [
  "admin",
  "adminList",
  "issueAccessToken",
  "validateAccessToken",
  "validateEntitlement",
  "grantCaseAccess",
  "verifyMasterToken",
  "checkCode",
  "resolveKeywordRoute",
  "notARealAction",
]

let failed = 0

function check(label, decision, expect) {
  const status = decision.ok ? 200 : decision.status
  const ok = expect(decision, status)
  if (!ok) {
    failed += 1
    console.error("FAIL", label, decision)
  }
}

for (const action of denied) {
  check(action, decideGasProxyForward(JSON.stringify({ action })), (d, status) => {
    return !d.ok && status >= 400 && status < 500
  })
}

check("broken json", decideGasProxyForward("{"), (d, status) => !d.ok && status >= 400 && status < 500)
check("not object", decideGasProxyForward("[]"), (d, status) => !d.ok && status >= 400 && status < 500)
check("missing action", decideGasProxyForward("{}"), (d, status) => !d.ok && status >= 400 && status < 500)
check(
  "oversize",
  decideGasProxyForward(JSON.stringify({ action: "auth", pad: "x".repeat(70_000) })),
  (d, status) => !d.ok && status === 413
)

check("auth", decideGasProxyForward(JSON.stringify({ action: "auth" })), (d) => d.ok && d.timeoutMs === 25_000)
check(
  "publicGetNews",
  decideGasProxyForward(JSON.stringify({ action: "publicGetNews" })),
  (d) => d.ok && d.timeoutMs === 10_000
)

if (failed > 0) {
  console.error(`${failed} failed`)
  process.exit(1)
}

console.log("gas proxy allowlist: disallowed actions are 4xx")
