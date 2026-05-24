import type { HandlerEvent, HandlerResponse } from "@netlify/functions";

export const NOTION_VERSION = "2025-09-03";
export const NOTION_API = "https://api.notion.com/v1/pages";

// ─── Rate limit ──────────────────────────────────────────────
// Best-effort in-memory rate limit per IP per endpoint. Netlify
// Functions cold-start often, so a determined bot can bypass this;
// it's intentionally light — paired with a honeypot for the bulk
// of spam mitigation.
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;
const buckets = new Map<string, number[]>();

export function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

// ─── Helpers ─────────────────────────────────────────────────
export function clientIp(event: HandlerEvent): string {
  const xff = event.headers["x-forwarded-for"] ?? event.headers["X-Forwarded-For"];
  if (xff) return xff.split(",")[0].trim();
  return event.headers["x-nf-client-connection-ip"] ?? "unknown";
}

export function json(statusCode: number, body: Record<string, unknown>): HandlerResponse {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function clean(s: unknown, max = 2000): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

export function parseBody(event: HandlerEvent): Record<string, unknown> | null {
  if (!event.body) return {};
  const ct = (event.headers["content-type"] ?? event.headers["Content-Type"] ?? "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      return JSON.parse(event.body) as Record<string, unknown>;
    }
    // application/x-www-form-urlencoded
    const params = new URLSearchParams(event.body);
    const out: Record<string, string> = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return out;
  } catch {
    return null;
  }
}

// ─── Notion ──────────────────────────────────────────────────
export interface NotionResult {
  ok: boolean;
  status: number;
  error?: string;
}

export async function notionCreatePage(
  dataSourceId: string,
  properties: Record<string, unknown>
): Promise<NotionResult> {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return { ok: false, status: 500, error: "NOTION_TOKEN not configured" };
  }
  const res = await fetch(NOTION_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { data_source_id: dataSourceId },
      properties,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[notion] ${res.status}: ${text}`);
    return { ok: false, status: res.status, error: `Notion ${res.status}` };
  }
  return { ok: true, status: res.status };
}

// Convenience constructors for Notion property values
export const title = (s: string) => ({ title: [{ text: { content: s.slice(0, 2000) } }] });
export const richText = (s: string) =>
  s ? { rich_text: [{ text: { content: s.slice(0, 2000) } }] } : { rich_text: [] };
export const select = (s: string) => ({ select: { name: s.slice(0, 100) } });
export const phone = (s: string) => (s ? { phone_number: s.slice(0, 100) } : { phone_number: null });
