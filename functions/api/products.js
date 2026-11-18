import { json, productRow } from "../_lib/api.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Database is not configured." }, 503);
  try {
    const url = new URL(request.url);
    const section = url.searchParams.get("section");
    let sql = "SELECT * FROM products";
    const params = [];
    if (section && section !== "all") {
      sql += " WHERE collection_section = ?";
      params.push(section);
    }
    sql += " ORDER BY homepage_order DESC, created_at DESC";
    const statement = env.DB.prepare(sql);
    const result = params.length ? await statement.bind(...params).all() : await statement.all();
    return json((result.results || []).map(productRow));
  } catch (error) {
    console.error("Products query failed", error);
    return json({ error: "Could not load products." }, 500);
  }
}
