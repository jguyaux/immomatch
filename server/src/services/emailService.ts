const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "ImmoMatch <noreply@immomatch.app>";

export async function sendMatchNotification(to: string, matchCount: number): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#16a34a;margin-bottom:8px">🏠 ${matchCount} nouveau${matchCount > 1 ? "x" : ""} bien${matchCount > 1 ? "s" : ""} correspond${matchCount > 1 ? "ent" : ""} à vos critères</h2>
      <p style="color:#374151">Le scan quotidien ImmoMatch a trouvé <strong>${matchCount} bien${matchCount > 1 ? "s" : ""}</strong> qui correspondent à vos critères de recherche.</p>
      <a href="https://immomatch.app/discoveries" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#16a34a;color:white;border-radius:8px;text-decoration:none;font-weight:600">
        Voir mes découvertes →
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">ImmoMatch — Votre assistant immobilier belge</p>
    </div>
  `;

  await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: `${matchCount} nouveau${matchCount > 1 ? "x" : ""} bien${matchCount > 1 ? "s" : ""} pour vous sur ImmoMatch`, html }),
  });
}
