import { adminJson, requireAdmin } from "../../_lib/admin.js";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = {
  "image/jpeg": { ext: "jpg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", signature: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": { ext: "webp", signature: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  "image/avif": { ext: "avif", signature: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && (String.fromCharCode(...b.slice(8, 12)) === "avif" || String.fromCharCode(...b.slice(8, 12)) === "avis") }
};

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  if (!env.IMAGES) {
    return adminJson({ error: "Image storage is not connected yet. Please finish the Cloudflare R2 setup." }, 503);
  }
  const baseUrl = String(env.IMAGE_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl) {
    return adminJson({ error: "The public image domain is not configured yet." }, 503);
  }

  let form;
  try { form = await request.formData(); }
  catch { return adminJson({ error: "Choose an image and try again." }, 400); }

  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return adminJson({ error: "Choose an image to upload." }, 400);
  if (file.size > MAX_BYTES) return adminJson({ error: "Each image must be 8 MB or smaller." }, 413);

  const type = TYPES[file.type];
  if (!type) return adminJson({ error: "Use a JPG, PNG, WebP or AVIF image." }, 415);
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!type.signature(header)) return adminJson({ error: "This file does not appear to be a valid " + type.ext.toUpperCase() + " image." }, 415);

  const requestedFolder = form.get("folder");
  const folder = ["products", "fabrics", "size-charts"].includes(requestedFolder) ? requestedFolder : "products";
  const key = folder + "/" + Date.now() + "-" + crypto.randomUUID() + "." + type.ext;

  try {
    await env.IMAGES.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable"
      },
      customMetadata: {
        uploadedBy: String(auth.admin?.email || "admin").slice(0, 160)
      }
    });
    return adminJson({ ok: true, key, url: baseUrl + "/" + key }, 201);
  } catch (error) {
    console.error("R2 image upload failed", error);
    return adminJson({ error: "The image could not be saved. Please try again." }, 500);
  }
}
