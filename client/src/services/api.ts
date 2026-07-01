import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(error.error || `Erreur ${res.status}`);
  }

  return res.json();
}

export const api = {
  getPreferences: () => request("/api/preferences"),
  savePreferences: (data: unknown) =>
    request("/api/preferences", { method: "PUT", body: JSON.stringify(data) }),
  getMatches: (page = 1, sortBy = "score") =>
    request(`/api/matches?page=${page}&sortBy=${sortBy}`),
  getDiscoveries: (page = 1) =>
    request(`/api/matches/discoveries?page=${page}`),
  getDiscoveriesCount: () =>
    request<{ count: number }>("/api/matches/discoveries/count"),
  getFavorites: () => request("/api/matches/favorites"),
  validateMatch: (id: string) =>
    request(`/api/matches/${id}/validate`, { method: "POST" }),
  updateMatch: (id: string, data: unknown) =>
    request(`/api/matches/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  importProperty: (url: string) =>
    request("/api/properties/import", { method: "POST", body: JSON.stringify({ url }) }),
  scanProperties: () =>
    request("/api/properties/scan", { method: "POST" }),
  getNeighborhood: (propertyId: string) =>
    request(`/api/neighborhood/${propertyId}`),
};
