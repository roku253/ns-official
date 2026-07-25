import type { PortalPreferences } from "@/lib/types"

export const DEFAULT_PORTAL_PREFERENCES: PortalPreferences = {
  displayName: "捜査員",
  theme: "dark",
  stickyTabBar: true,
  scanlineEnabled: true,
  crtEnabled: true,
  soundEffectsEnabled: true,
  notificationSoundEnabled: true,
  browserNotifyEnabled: false,
  consentAutoSync: true,
  consentLocation: false,
  consentCamera: true,
  consentNotifications: false,
}

function revivePortalPreferencesRaw(raw: unknown): Partial<PortalPreferences> {
  if (!raw || typeof raw !== "object") return {}
  const o = raw as Record<string, unknown>
  const theme = o.theme === "light" || o.theme === "dark" ? o.theme : undefined
  return {
    displayName: typeof o.displayName === "string" ? o.displayName : undefined,
    avatarImageDataUrl: typeof o.avatarImageDataUrl === "string" ? o.avatarImageDataUrl : undefined,
    theme,
    stickyTabBar: typeof o.stickyTabBar === "boolean" ? o.stickyTabBar : undefined,
    scanlineEnabled: typeof o.scanlineEnabled === "boolean" ? o.scanlineEnabled : undefined,
    crtEnabled: typeof o.crtEnabled === "boolean" ? o.crtEnabled : undefined,
    soundEffectsEnabled: typeof o.soundEffectsEnabled === "boolean" ? o.soundEffectsEnabled : undefined,
    notificationSoundEnabled:
      typeof o.notificationSoundEnabled === "boolean" ? o.notificationSoundEnabled : undefined,
    browserNotifyEnabled:
      typeof o.browserNotifyEnabled === "boolean" ? o.browserNotifyEnabled : undefined,
    consentAutoSync: typeof o.consentAutoSync === "boolean" ? o.consentAutoSync : undefined,
    consentLocation: typeof o.consentLocation === "boolean" ? o.consentLocation : undefined,
    consentCamera: typeof o.consentCamera === "boolean" ? o.consentCamera : undefined,
    consentNotifications:
      typeof o.consentNotifications === "boolean" ? o.consentNotifications : undefined,
  }
}

export function mergePortalPreferences(partial: Partial<PortalPreferences> | undefined): PortalPreferences {
  const base = { ...DEFAULT_PORTAL_PREFERENCES, ...(partial ?? {}) }
  const name = (base.displayName || "").trim()
  return {
    ...base,
    displayName: name || DEFAULT_PORTAL_PREFERENCES.displayName,
  }
}

export function portalPreferencesFromProgressJson(raw: unknown): PortalPreferences {
  return mergePortalPreferences(revivePortalPreferencesRaw(raw))
}
