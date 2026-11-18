import { json, fabricRow } from "../_lib/api.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Database is not configured." }, 503);
  try {
    const result = await env.DB.prepare(
      "SELECT * FROM fabrics ORDER BY created_at DESC"
    ).all();
    return json((result.results || []).map(fabricRow));
  } catch (error) {
    console.error("Fabrics query failed", error);
    return json({ error: "Could not load fabrics." }, 500);
  }
}
