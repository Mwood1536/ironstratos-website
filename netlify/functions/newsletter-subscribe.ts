import type { Handler } from "@netlify/functions";
import {
  clean,
  clientIp,
  isEmail,
  json,
  notionCreatePage,
  parseBody,
  rateLimited,
  richText,
  select,
  title,
} from "./_shared";

const DATA_SOURCE_ID = "555437ab-76e2-4707-b375-108614db9967"; // CC Newsletter Subscribers

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const body = parseBody(event);
  if (!body) return json(400, { ok: false, error: "Invalid request body" });

  // Honeypot — silently accept to fool bots
  if (clean(body.website)) return json(200, { ok: true });

  const email = clean(body.email, 320);
  if (!isEmail(email)) return json(400, { ok: false, error: "Please enter a valid email." });

  if (rateLimited(`newsletter:${clientIp(event)}`)) {
    return json(429, { ok: false, error: "Too many submissions. Please try again later." });
  }

  const sourcePage = clean(body.source, 200) || "unknown";

  const result = await notionCreatePage(DATA_SOURCE_ID, {
    Email: title(email),
    "Source Page": richText(sourcePage),
    Status: select("Active"),
  });

  if (!result.ok) {
    return json(500, { ok: false, error: "Could not save subscription. Please try again." });
  }
  return json(200, { ok: true });
};
