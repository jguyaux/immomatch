import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { scanBiddit, saveProperties as saveBidditProperties } from "../services/bidditService.js";
import { scanTrevi, saveProperties as saveTreviProperties } from "../services/treviService.js";
import { scanImmoweb, saveProperties as saveImmowebProperties } from "../services/immowebScanner.js";
import { processMatchesForAllUsers, processMatchesForUser } from "../services/matchingService.js";

type ProgressFn = (data: Record<string, unknown>) => void;
const noop: ProgressFn = () => {};

export function startDailyScanJob() {
  cron.schedule("0 7 * * *", () => runDailyScanWithProgress(noop));
  console.log("[CRON] Scan quotidien programme (7h00)");
}

const SCAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max

export async function runDailyScanWithProgress(send: ProgressFn, userId?: string) {
  console.log(`[CRON] Debut du scan${userId ? ` (user ${userId})` : " quotidien"}`);

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Scan timeout (5 min)")), SCAN_TIMEOUT_MS)
  );
  return Promise.race([_runScan(send, userId), timeout]);
}

function withSourceTimeout<T>(promise: Promise<T>, label: string, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms / 1000}s)`)), ms)
    ),
  ]);
}

async function _runScan(send: ProgressFn, userId?: string) {
  const userPrefs = await getAllUserPrefs(userId);
  const zones = [...new Set(userPrefs.flatMap((p) => p.zones))];
  const transactionType = userPrefs[0]?.transaction_type || "achat";
  const propertyTypes = [...new Set(userPrefs.flatMap((p) => p.property_types))];

  send({ type: "progress", source: "init", message: `Zones: ${zones.join(", ")}`, step: 0, total: 4 });

  let totalImported = 0;

  // 1. Immoweb — 2 min max
  send({ type: "progress", source: "Immoweb", message: "Recherche sur Immoweb...", step: 1, total: 4 });
  try {
    const props = await withSourceTimeout(
      scanImmoweb(zones, transactionType, propertyTypes),
      "Immoweb", 120_000
    );
    await saveImmowebProperties(props);
    totalImported += props.length;
    send({ type: "progress", source: "Immoweb", message: `${props.length} biens trouvés sur Immoweb`, step: 1, total: 4 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    console.error("[CRON] Erreur scan Immoweb:", msg);
    send({ type: "progress", source: "Immoweb", message: `Immoweb ignoré (${msg}), on continue...`, step: 1, total: 4 });
  }

  // 2. Biddit — 90s max
  send({ type: "progress", source: "Biddit", message: "Recherche sur Biddit...", step: 2, total: 4 });
  try {
    const props = await withSourceTimeout(scanBiddit(zones), "Biddit", 90_000);
    await saveBidditProperties(props);
    totalImported += props.length;
    send({ type: "progress", source: "Biddit", message: `${props.length} biens trouvés sur Biddit`, step: 2, total: 4 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    console.error("[CRON] Erreur scan Biddit:", msg);
    send({ type: "progress", source: "Biddit", message: `Biddit ignoré (${msg}), on continue...`, step: 2, total: 4 });
  }

  // 3. Trevi — 90s max
  send({ type: "progress", source: "Trevi", message: "Recherche sur Trevi...", step: 3, total: 4 });
  try {
    const props = await withSourceTimeout(scanTrevi(zones, transactionType), "Trevi", 90_000);
    await saveTreviProperties(props);
    totalImported += props.length;
    send({ type: "progress", source: "Trevi", message: `${props.length} biens trouvés sur Trevi`, step: 3, total: 4 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    console.error("[CRON] Erreur scan Trevi:", msg);
    send({ type: "progress", source: "Trevi", message: `Trevi ignoré (${msg}), on continue...`, step: 3, total: 4 });
  }

  // 4. Matching
  send({ type: "progress", source: "Matching", message: "Analyse et scoring des biens...", step: 4, total: 4 });
  const matched = userId
    ? await processMatchesForUser(userId)
    : await processMatchesForAllUsers();

  console.log(`[CRON] Scan terminé: ${totalImported} biens importés, ${matched} matchs créés`);
  return { imported: totalImported, matched };
}

async function getAllUserPrefs(userId?: string): Promise<{ zones: string[]; transaction_type: string; property_types: string[] }[]> {
  let query = supabase.from("user_preferences").select("zones, transaction_type, property_types");
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  return data || [];
}
