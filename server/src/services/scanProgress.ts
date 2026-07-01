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

let state: ScanProgress = {
  status: "idle",
  step: 0,
  total: 4,
  source: "",
  message: "",
  imported: 0,
  matched: 0,
  startedAt: null,
};

export function getScanProgress(): ScanProgress {
  return { ...state };
}

export function updateScanProgress(update: Partial<ScanProgress>): void {
  state = { ...state, ...update };
}

export function resetScanProgress(): void {
  state = {
    status: "idle",
    step: 0,
    total: 4,
    source: "",
    message: "",
    imported: 0,
    matched: 0,
    startedAt: null,
  };
}
