import { LS_GATE, LS_SESSION } from "@/lib/storage-keys"

export function readGateEmail(): string {
  if (typeof window === "undefined") return ""
  return (
    window.sessionStorage.getItem(LS_SESSION.GATE_EMAIL) ||
    window.localStorage.getItem(LS_GATE.PENDING_EMAIL) ||
    ""
  )
}

export function writeGateEmailAfterStep1(normalizedEmail: string): void {
  window.sessionStorage.setItem(LS_SESSION.GATE_EMAIL, normalizedEmail)
  window.localStorage.setItem(LS_GATE.PENDING_EMAIL, normalizedEmail)
}

export function writeGateEmailAfterSetup(normalizedEmail: string): void {
  window.localStorage.setItem(LS_GATE.PENDING_EMAIL, normalizedEmail)
}

export function clearGateEmail(): void {
  window.sessionStorage.removeItem(LS_SESSION.GATE_EMAIL)
  window.localStorage.removeItem(LS_GATE.PENDING_EMAIL)
}

/** STEP1 省略で STEP2 のみ（登録済み・別端末用） */
export function readStep2Direct(): boolean {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(LS_SESSION.STEP2_DIRECT) === "1"
}

export function setStep2Direct(): void {
  window.sessionStorage.setItem(LS_SESSION.STEP2_DIRECT, "1")
}

export function clearStep2Direct(): void {
  window.sessionStorage.removeItem(LS_SESSION.STEP2_DIRECT)
}
