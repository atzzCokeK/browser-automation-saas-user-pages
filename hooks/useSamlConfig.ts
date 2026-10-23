import { useSyncExternalStore } from "react";

export type SamlIdpSettings = {
  entityId: string;
  ssoUrl: string;
  certificate: string;
  enforceSignature: boolean;
};

const emptySettings: SamlIdpSettings = {
  entityId: "",
  ssoUrl: "",
  certificate: "",
  enforceSignature: false,
};

let current = emptySettings;
const listeners = new Set<() => void>();

export function getSamlIdpSettings(): SamlIdpSettings {
  return current;
}

export function setSamlIdpSettings(next: SamlIdpSettings) {
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeSamlIdpSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSamlIdpSettings(): SamlIdpSettings {
  return useSyncExternalStore(subscribeSamlIdpSettings, getSamlIdpSettings, getSamlIdpSettings);
}
