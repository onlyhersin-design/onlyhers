import { json, fabricRow } from "../../_lib/api.js";

export async function onRequestGet({ params, env }) {
  if (!env.DB) return json({ error: "Database is not configured." }, 503);
  const id = String(params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Fabric not found." }, 404);
  try {
    const row = await env.DB.prepare("SELECT * FROM fabrics WHERE id = ? LIMIT 1").bind(id).first();
    return row ? json(fabricRow(row)) : json({ error: "Fabric not found." }, 404);
  } catch (error) {
    console.error("Fabric query failed", error);
    return json({ error: "Could not load fabric." }, 500);
  }
}
