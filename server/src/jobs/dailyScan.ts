import cron from "node-cron";
import { scrapeImmoweb, saveProperties } from "../services/scraperService.js";
import { processMatchesForAllUsers } from "../services/matchingService.js";

export function startDailyScanJob() {
  // Chaque jour à 7h du matin
  cron.schedule("0 7 * * *", async () => {
    console.log("[CRON] Début du scan quotidien");

    try {
      const properties = await scrapeImmoweb();
      await saveProperties(properties);
      await processMatchesForAllUsers();
      console.log("[CRON] Scan quotidien terminé");
    } catch (error) {
      console.error("[CRON] Erreur lors du scan:", error);
    }
  });

  console.log("[CRON] Job de scan quotidien programmé (7h00)");
}
