import type { Handler } from "@netlify/functions";
import {
  clean,
  clientIp,
  isEmail,
  json,
  notionCreatePage,
  parseBody,
  phone,
  rateLimited,
  richText,
  select,
  title,
} from "./_shared";

const DATA_SOURCE_ID = "a0e9780a-4984-4773-b348-172f6fc122e5"; // CC Demo Requests

const ALLOWED_SIZES = new Set(["<10", "10-50", "50-200", "200-500", "500+", "Unknown"]);
const ALLOWED_TIERS = new Set(["Pro Web", "Enterprise", "Not Sure"]);
const ALLOWED_TIMELINES = new Set(["Now", "1-3 months", "3-6 months", "Just researching"]);

async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("[telegram] missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`[telegram] ${res.status}: ${t}`);
    }
  } catch (err) {
    console.error(`[telegram] fetch failed: ${(err as Error).message}`);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const body = parseBody(event);
  if (!body) return json(400, { ok: false, error: "Invalid request body" });

  if (clean(body.website)) return json(200, { ok: true });

  const name = clean(body.name, 200);
  const email = clean(body.email, 320);
  const phoneNum = clean(body.phone, 50);
  const company = clean(body.company, 200);
  const jobTitle = clean(body.title, 200);
  let plantSize = clean(body.plantSize, 50);
  let tierInterest = clean(body.tierInterest, 50);
  let timeline = clean(body.timeline, 50);
  const problem = clean(body.problem, 4000);

  if (!name) return json(400, { ok: false, error: "Name is required." });
  if (!isEmail(email)) return json(400, { ok: false, error: "Please enter a valid email." });
  if (!company) return json(400, { ok: false, error: "Company is required." });
  if (!problem) return json(400, { ok: false, error: "Tell us a bit about the problem you're trying to solve." });

  if (!ALLOWED_SIZES.has(plantSize)) plantSize = "Unknown";
  if (!ALLOWED_TIERS.has(tierInterest)) tierInterest = "Not Sure";
  if (!ALLOWED_TIMELINES.has(timeline)) timeline = "Just researching";

  if (rateLimited(`demo:${clientIp(event)}`)) {
    return json(429, { ok: false, error: "Too many submissions. Please try again later." });
  }

  const result = await notionCreatePage(DATA_SOURCE_ID, {
    Email: title(email),
    Name: richText(name),
    Phone: phone(phoneNum),
    Company: richText(company),
    Title: richText(jobTitle),
    "Plant Size": select(plantSize),
    "Tier Interest": select(tierInterest),
    Timeline: select(timeline),
    Problem: richText(problem),
    Status: select("New"),
  });

  if (!result.ok) {
    return json(500, { ok: false, error: "Could not save your request. Please try again." });
  }

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const msg =
    `🔥 <b>New demo request</b>\n` +
    `${escapeHtml(name)} from ${escapeHtml(company)}\n` +
    `Tier: ${escapeHtml(tierInterest)} · Timeline: ${escapeHtml(timeline)}\n` +
    `Email: ${escapeHtml(email)}${phoneNum ? ` · Phone: ${escapeHtml(phoneNum)}` : ""}\n` +
    `View: check Notion (CC Demo Requests)`;

  // fire and forget — don't block the user on Telegram errors
  void notifyTelegram(msg);

  return json(200, { ok: true });
};
