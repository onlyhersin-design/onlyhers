import { adminJson, requireAdmin, cleanText } from "../../_lib/admin.js";

const TYPES = ["Tops","Short Tops","Dresses","Maxi Dress","Trousers","Coord Sets"];

export async function onRequestGet({ request, env }) {
  if (!env.DB) return adminJson({ error: "Database is not connected." }, 503);
  try {
    const result = await env.DB.prepare("SELECT garment_type, image_url, updated_at FROM size_charts ORDER BY garment_type").all();
    return adminJson({ sizeCharts: result.results || [], garmentTypes: TYPES });
  } catch (error) {
    console.error(error);
    return adminJson({ error: "Could not load size charts." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  if (!env.DB) return adminJson({ error: "Database is not connected." }, 503);
  let body;
  try { body = await request.json(); } catch { return adminJson({ error: "Invalid size chart details." }, 400); }
  const garmentType = cleanText(body.garment_type, 80);
  const imageUrl = cleanText(body.image_url, 2000);
  if (!TYPES.includes(garmentType)) return adminJson({ error: "Choose a valid garment type." }, 400);
  if (!/^https:\/\//i.test(imageUrl)) return adminJson({ error: "Upload a size chart image first." }, 400);
  try {
    const updatedAt = new Date().toISOString();
    await env.DB.prepare("INSERT INTO size_charts (garment_type, image_url, updated_at) VALUES (?, ?, ?) ON CONFLICT(garment_type) DO UPDATE SET image_url=excluded.image_url, updated_at=excluded.updated_at")
      .bind(garmentType, imageUrl, updatedAt).run();
    return adminJson({ ok: true, garment_type: garmentType, image_url: imageUrl, updated_at: updatedAt });
  } catch (error) {
    console.error(error);
    return adminJson({ error: "Could not save this size chart." }, 500);
  }
}
