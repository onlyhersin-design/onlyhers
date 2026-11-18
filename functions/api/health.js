import { json } from "../_lib/api.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: "Database binding DB is not configured." }, 503);
  try {
    const result = await env.DB.prepare("SELECT 1 AS ok").first();
    return json({ ok: result?.ok === 1, service: "onlyhers-api" });
  } catch (error) {
    console.error("Health check failed", error);
    return json({ ok: false, error: "Database unavailable." }, 503);
  }
}
