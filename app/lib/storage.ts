import { Address, CustomerProfile } from "../types";

const KEYS = {
  USER_PROFILE: "manga_delivery_customer_profile",
  ADDRESSES: "manga_delivery_addresses",
  CURRENT_ADDRESS: "manga_delivery_current_address",
  ADMIN_AUTH: "manga_delivery_admin_session",
  DEVICE_ID: "manga_delivery_device_id",
};

// Safe window check
const isClient = typeof window !== "undefined";

function dispatchLocalEvent(eventName: string) {
  if (isClient) {
    window.dispatchEvent(new Event(eventName));
  }
}

// ----------------- CUSTOMER PROFILE -----------------
export function getCustomerProfile(): CustomerProfile {
  if (!isClient) return { name: "", phone: "" };
  try {
    const raw = localStorage.getItem(KEYS.USER_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao carregar perfil do cliente:", err);
  }
  return { name: "", phone: "" };
}

export function saveCustomerProfile(profile: CustomerProfile): void {
  if (!isClient) return;
  try {
    localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    dispatchLocalEvent("delivery_profile_updated");
  } catch (err) {
    console.error("Erro ao salvar perfil do cliente:", err);
  }
}

// ----------------- ADDRESSES -----------------
export function getSavedAddresses(): Address[] {
  if (!isClient) return [];
  try {
    const raw = localStorage.getItem(KEYS.ADDRESSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Deduplicate by id to prevent React key errors
        const seen = new Set<string>();
        return parsed.filter((addr: Address) => {
          if (seen.has(addr.id)) return false;
          seen.add(addr.id);
          return true;
        });
      }
    }
  } catch (err) {
    console.error("Erro ao ler endereços:", err);
  }
  return [];
}

export function saveSavedAddresses(addresses: Address[]): void {
  if (!isClient) return;
  try {
    localStorage.setItem(KEYS.ADDRESSES, JSON.stringify(addresses));
    dispatchLocalEvent("delivery_addresses_updated");
  } catch (err) {
    console.error("Erro ao salvar endereços:", err);
  }
}

export function getCurrentAddress(): Address | null {
  const allAddresses = getSavedAddresses();
  if (!isClient) return allAddresses[0] || null;
  try {
    const raw = localStorage.getItem(KEYS.CURRENT_ADDRESS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch (err) {
    console.error("Erro ao ler endereço ativo:", err);
  }
  return allAddresses[0] || null;
}

export function saveCurrentAddress(address: Address): void {
  if (!isClient) return;
  try {
    localStorage.setItem(KEYS.CURRENT_ADDRESS, JSON.stringify(address));
    dispatchLocalEvent("delivery_current_address_updated");
  } catch (err) {
    console.error("Erro ao salvar endereço ativo:", err);
  }
}

// ----------------- CUSTOMER DEVICE ID -----------------
export function getDeviceId(): string {
  if (!isClient) return "dev_ssr";
  try {
    let devId = localStorage.getItem(KEYS.DEVICE_ID);
    if (!devId) {
      devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(KEYS.DEVICE_ID, devId);
    }
    return devId;
  } catch (err) {
    console.error("Erro ao ler/gerar Device ID:", err);
    return "dev_fallback";
  }
}

// ----------------- ADMIN AUTH -----------------
export function getAdminAuth(): boolean {
  if (!isClient) return false;
  return sessionStorage.getItem(KEYS.ADMIN_AUTH) === "authenticated";
}

export function setAdminAuth(authenticated: boolean): void {
  if (!isClient) return;
  if (authenticated) {
    sessionStorage.setItem(KEYS.ADMIN_AUTH, "authenticated");
  } else {
    sessionStorage.removeItem(KEYS.ADMIN_AUTH);
  }
}

export function clearAdminAuth(): void {
  if (!isClient) return;
  sessionStorage.removeItem(KEYS.ADMIN_AUTH);
}
