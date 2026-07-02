import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { scanImmoweb, saveProperties as saveImmowebProperties } from "../services/immowebScanner.js";
import { processMatchesForAllUsers, processMatchesForUser } from "../services/matchingService.js";
import { sendMatchNotification } from "../services/emailService.js";

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

  send({ type: "progress", source: "init", message: `Zones: ${zones.join(", ")}`, step: 0, total: 2 });

  let totalImported = 0;

  // 1. Immoweb — 2 min max
  send({ type: "progress", source: "Immoweb", message: "Recherche sur Immoweb...", step: 1, total: 2 });
  try {
    const props = await withSourceTimeout(
      scanImmoweb(zones, transactionType, propertyTypes),
      "Immoweb", 120_000
    );
    await saveImmowebProperties(props);
    totalImported += props.length;
    send({ type: "progress", source: "Immoweb", message: `${props.length} biens trouvés sur Immoweb`, step: 1, total: 2 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    console.error("[CRON] Erreur scan Immoweb:", msg);
    send({ type: "progress", source: "Immoweb", message: `Immoweb ignoré (${msg}), on continue...`, step: 1, total: 2 });
  }

  // 2. Matching
  send({ type: "progress", source: "Matching", message: "Analyse et scoring des biens...", step: 2, total: 2 });
  const matched = userId
    ? await processMatchesForUser(userId)
    : await processMatchesForAllUsers();

  // Notifier par email uniquement pour le CRON (pas le scan manuel)
  if (!userId && matched > 0) {
    await notifyUsersWithNewMatches();
  }

  console.log(`[CRON] Scan terminé: ${totalImported} biens importés, ${matched} matchs créés`);
  return { imported: totalImported, matched };
}

async function notifyUsersWithNewMatches(): Promise<void> {
  // Récupère les utilisateurs avec des découvertes créées aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: recentMatches } = await supabase
    .from("property_matches")
    .select("user_id")
    .gte("created_at", today.toISOString())
    .not("is_validated", "eq", true)
    .not("is_dismissed", "eq", true);

  if (!recentMatches || recentMatches.length === 0) return;

  const countByUser = new Map<string, number>();
  for (const { user_id } of recentMatches) {
    countByUser.set(user_id, (countByUser.get(user_id) ?? 0) + 1);
  }

  for (const [userId, count] of countByUser) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (email) {
      await sendMatchNotification(email, count);
      console.log(`[Email] Notification envoyée à ${email} (${count} matchs)`);
    }
  }
}

async function getAllUserPrefs(userId?: string): Promise<{ zones: string[]; transaction_type: string; property_types: string[] }[]> {
  let query = supabase.from("user_preferences").select("zones, transaction_type, property_types");
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  return data || [];
}
