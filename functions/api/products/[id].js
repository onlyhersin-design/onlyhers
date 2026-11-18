import { json, productRow } from "../../_lib/api.js";

export async function onRequestGet({ params, env }) {
  if (!env.DB) return json({ error: "Database is not configured." }, 503);
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return json({ error: "Product not found." }, 404);
  try {
    const row = await env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(id).first();
    return row ? json(productRow(row)) : json({ error: "Product not found." }, 404);
  } catch (error) {
    console.error("Product query failed", error);
    return json({ error: "Could not load product." }, 500);
  }
}
