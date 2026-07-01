import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { scanBiddit, saveProperties as saveBidditProperties } from "../services/bidditService.js";
import { scanTrevi, saveProperties as saveTreviProperties } from "../services/treviService.js";
import { scanImmoweb, saveProperties as saveImmowebProperties } from "../services/immowebScanner.js";
import { processMatchesForAllUsers } from "../services/matchingService.js";

type ProgressFn = (data: Record<string, unknown>) => void;
const noop: ProgressFn = () => {};

export function startDailyScanJob() {
  cron.schedule("0 7 * * *", () => runDailyScanWithProgress(noop));
  console.log("[CRON] Scan quotidien programme (7h00)");
}

const SCAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max

export async function runDailyScanWithProgress(send: ProgressFn) {
  console.log("[CRON] Debut du scan quotidien");

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Scan timeout (5 min)")), SCAN_TIMEOUT_MS)
  );
  return Promise.race([_runScan(send), timeout]);
}

async function _runScan(send: ProgressFn) {

  const userPrefs = await getAllUserPrefs();
  const zones = [...new Set(userPrefs.flatMap((p) => p.zones))];
  const transactionType = userPrefs[0]?.transaction_type || "achat";
  const propertyTypes = [...new Set(userPrefs.flatMap((p) => p.property_types))];

  send({ type: "progress", source: "init", message: `Zones: ${zones.join(", ")}`, step: 0, total: 4 });

  let totalImported = 0;

  // 1. Immoweb
  send({ type: "progress", source: "Immoweb", message: "Recherche sur Immoweb...", step: 1, total: 4 });
  try {
    const props = await scanImmoweb(zones, transactionType, propertyTypes);
    await saveImmowebProperties(props);
    totalImported += props.length;
    send({ type: "progress", source: "Immoweb", message: `${props.length} biens trouves sur Immoweb`, step: 1, total: 4 });
  } catch (err) {
    console.error("[CRON] Erreur scan Immoweb:", err);
    send({ type: "progress", source: "Immoweb", message: "Erreur Immoweb, on continue...", step: 1, total: 4 });
  }

  // 2. Biddit
  send({ type: "progress", source: "Biddit", message: "Recherche sur Biddit...", step: 2, total: 4 });
  try {
    const props = await scanBiddit(zones);
    await saveBidditProperties(props);
    totalImported += props.length;
    send({ type: "progress", source: "Biddit", message: `${props.length} biens trouves sur Biddit`, step: 2, total: 4 });
  } catch (err) {
    console.error("[CRON] Erreur scan Biddit:", err);
    send({ type: "progress", source: "Biddit", message: "Erreur Biddit, on continue...", step: 2, total: 4 });
  }

  // 3. Trevi
  send({ type: "progress", source: "Trevi", message: "Recherche sur Trevi...", step: 3, total: 4 });
  try {
    const props = await scanTrevi(zones, transactionType);
    await saveTreviProperties(props);
    totalImported += props.length;
    send({ type: "progress", source: "Trevi", message: `${props.length} biens trouves sur Trevi`, step: 3, total: 4 });
  } catch (err) {
    console.error("[CRON] Erreur scan Trevi:", err);
    send({ type: "progress", source: "Trevi", message: "Erreur Trevi, on continue...", step: 3, total: 4 });
  }

  // 4. Matching (toujours relance pour rafraichir les decouvertes avec les criteres actuels)
  send({ type: "progress", source: "Matching", message: "Analyse et scoring des biens...", step: 4, total: 4 });
  const matched = await processMatchesForAllUsers();

  console.log(`[CRON] Scan termine: ${totalImported} biens importes, ${matched} matchs crees`);
  return { imported: totalImported, matched };
}

async function getAllUserPrefs(): Promise<{ zones: string[]; transaction_type: string; property_types: string[] }[]> {
  const { data } = await supabase
    .from("user_preferences")
    .select("zones, transaction_type, property_types");
  return data || [];
}
