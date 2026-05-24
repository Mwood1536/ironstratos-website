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

const DATA_SOURCE_ID = "d2db4990-6027-4ae9-b690-0e6d67063501"; // CC Beta Interest

const ALLOWED_APPS = new Set(["Root Cause AI", "NConform", "Both"]);
const ALLOWED_SIZES = new Set(["<10", "10-50", "50-200", "200-500", "500+", "Unknown"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const body = parseBody(event);
  if (!body) return json(400, { ok: false, error: "Invalid request body" });

  if (clean(body.website)) return json(200, { ok: true });

  const name = clean(body.name, 200);
  const email = clean(body.email, 320);
  const company = clean(body.company, 200);
  const role = clean(body.role, 200);
  let whichApp = clean(body.whichApp, 50);
  let plantSize = clean(body.plantSize, 50);
  const currentProcess = clean(body.currentProcess, 2000);

  if (!name) return json(400, { ok: false, error: "Name is required." });
  if (!isEmail(email)) return json(400, { ok: false, error: "Please enter a valid email." });
  if (!company) return json(400, { ok: false, error: "Company is required." });
  if (!ALLOWED_APPS.has(whichApp)) return json(400, { ok: false, error: "Pick which app you're interested in." });
  if (!ALLOWED_SIZES.has(plantSize)) plantSize = "Unknown";

  if (rateLimited(`beta:${clientIp(event)}`)) {
    return json(429, { ok: false, error: "Too many submissions. Please try again later." });
  }

  const result = await notionCreatePage(DATA_SOURCE_ID, {
    Email: title(email),
    Name: richText(name),
    Company: richText(company),
    Role: richText(role),
    "Which App": select(whichApp),
    "Plant Size": select(plantSize),
    "Current RCA Process": richText(currentProcess),
    Status: select("New"),
  });

  if (!result.ok) {
    return json(500, { ok: false, error: "Could not save your interest. Please try again." });
  }
  return json(200, { ok: true });
};
