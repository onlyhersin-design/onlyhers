import { adminJson, requireAdmin } from "../../_lib/admin.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  if (!env.DB) return adminJson({ error: "Database is not connected." }, 503);

  try {
    const results = await env.DB.batch([
      env.DB.prepare(`
        UPDATE products
        SET image_url = '',
            image_urls = '[]',
            size_chart_url = NULL,
            instagram_photo_url = NULL,
            youtube_photo_url = NULL
      `),
      env.DB.prepare(`
        UPDATE fabrics
        SET image_url = '',
            image_urls = '[]',
            instagram_photo_url = NULL,
            youtube_photo_url = NULL
      `)
    ]);

    return adminJson({
      ok: true,
      productsCleared: Number(results?.[0]?.meta?.changes || 0),
      fabricsCleared: Number(results?.[1]?.meta?.changes || 0)
    });
  } catch (error) {
    console.error("Image reference cleanup failed", error);
    return adminJson({ error: "Could not clear the old image references. Please try again." }, 500);
  }
}
