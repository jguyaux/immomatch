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
  scanProperties: async (
    onProgress: (data: { type: string; source?: string; message?: string; step?: number; total?: number; imported?: number; matched?: number }) => void
  ): Promise<{ imported: number; matched: number }> => {
    const headers = await getAuthHeaders();
    return new Promise((resolve, reject) => {
      const url = `${API_URL}/api/properties/scan`;
      const eventSource = new EventSource(url);

      // EventSource doesn't support custom headers, so we use fetch with streaming
      fetch(url, { headers }).then(async (res) => {
        const reader = res.body?.getReader();
        if (!reader) { reject(new Error("No reader")); return; }
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const match = line.match(/^data:\s*(.+)$/m);
            if (!match) continue;
            try {
              const data = JSON.parse(match[1]);
              if (data.type === "done") {
                resolve({ imported: data.imported, matched: data.matched });
                return;
              } else if (data.type === "error") {
                reject(new Error(data.message));
                return;
              }
              onProgress(data);
            } catch {}
          }
        }
        resolve({ imported: 0, matched: 0 });
      }).catch(reject);
    });
  },
};
