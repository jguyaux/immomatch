import { supabase } from "../config/supabase.js";

export interface ScanProgress {
  status: "idle" | "running" | "done" | "error";
  step: number;
  total: number;
  source: string;
  message: string;
  imported: number;
  matched: number;
  startedAt: number | null;
}

const DEFAULT: ScanProgress = {
  status: "idle", step: 0, total: 4, source: "", message: "", imported: 0, matched: 0, startedAt: null,
};

// Fallback in-memory for when Supabase is not yet initialized
let memState: ScanProgress = { ...DEFAULT };

export async function getScanProgress(): Promise<ScanProgress> {
  const { data } = await supabase.from("scan_progress").select("*").eq("id", "singleton").single();
  if (!data) return { ...memState };
  return {
    status: data.status,
    step: data.step,
    total: data.total,
    source: data.source ?? "",
    message: data.message ?? "",
    imported: data.imported ?? 0,
    matched: data.matched ?? 0,
    startedAt: data.started_at ?? null,
  };
}

export async function updateScanProgress(update: Partial<ScanProgress>): Promise<void> {
  memState = { ...memState, ...update };
  await supabase.from("scan_progress").upsert({
    id: "singleton",
    status: memState.status,
    step: memState.step,
    total: memState.total,
    source: memState.source,
    message: memState.message,
    imported: memState.imported,
    matched: memState.matched,
    started_at: memState.startedAt,
    updated_at: Date.now(),
  }, { onConflict: "id" });
}
