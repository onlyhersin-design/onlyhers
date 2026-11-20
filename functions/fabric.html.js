function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}
function imageList(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === "string" && item.trim());
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string" && item.trim()) : [];
  } catch { return []; }
}
function available(value) { return value !== false && Number(value) !== 0; }
function setAttributeById(html, tag, id, attribute, value) {
  const pattern = new RegExp("(<" + tag + "\\b[^>]*\\bid=\"" + id + "\"[^>]*\\b" + attribute + "=\")[^\"]*(\")", "i");
  return html.replace(pattern, (_match, before, after) => before + escapeHtml(value) + after);
}
function schemaText(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }

export async function onRequest(context) {
  const response = await context.next();
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return response;

  const url = new URL(context.request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0 || !context.env.DB) {
    const html = await response.text();
    const output = html.replace(
      '<meta name="robots" content="index, follow, max-image-preview:large">',
      '<meta name="robots" content="noindex, follow">'
    );
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(output, { status: response.status, headers });
  }

  try {
    const fabric = await context.env.DB.prepare("SELECT * FROM fabrics WHERE id = ?").bind(id).first();
    let html = await response.text();
    if (!fabric) {
      html = html.replace(
        '<meta name="robots" content="index, follow, max-image-preview:large">',
        '<meta name="robots" content="noindex, follow">'
      );
      const headers = new Headers(response.headers);
      headers.set("cache-control", "no-store");
      headers.delete("content-length");
      return new Response(html, { status: 404, headers });
    }

    const images = [...new Set([
      fabric.image_url,
      ...imageList(fabric.image_urls),
      fabric.instagram_photo_url,
      fabric.youtube_photo_url
    ].filter(value => typeof value === "string" && /^https?:\/\//i.test(value)))];
    const canonical = "https://onlyhers.in/fabric.html?id=" + id;
    const name = fabric.name || "onlyhers fabric";
    const description = String(fabric.description || "Selected dress fabric from onlyhers, available for your own clothing and creative projects.").replace(/\s+/g, " ").slice(0, 160);
    const priceValue = Number(fabric.price);
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": canonical + "#product",
      "url": canonical,
      "name": name,
      "description": fabric.description || "Selected dress fabric from onlyhers, available for your own clothing and creative projects.",
      ...(images.length ? { "image": images } : {}),
      "sku": fabric.fabric_code || String(id),
      "brand": { "@type": "Brand", "name": "onlyhers" },
      "category": fabric.material || fabric.pattern || "Fabric",
      ...(fabric.material ? { "material": fabric.material } : {}),
      ...(Number.isFinite(priceValue) && priceValue > 0 ? {
        "offers": {
          "@type": "Offer",
          "url": canonical,
          "priceCurrency": "INR",
          "price": priceValue.toFixed(2),
          "availability": available(fabric.is_available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "itemCondition": "https://schema.org/NewCondition",
          "seller": { "@type": "Organization", "name": "onlyhers", "url": "https://onlyhers.in/" }
        }
      } : {})
    };

    const priceText = Number.isFinite(priceValue) && priceValue > 0
      ? "₹" + priceValue.toLocaleString("en-IN") + " / metre"
      : "Price on request";
    const stockText = available(fabric.is_available) ? "In Stock" : "Out of Stock";
    const cover = images[0] || "";
    const content = (cover ? '<div class="fabric-gallery"><div class="fabric-main-image"><img src="' +
      escapeHtml(cover) + '" alt="' + escapeHtml(name) + '"></div></div>' : "") +
      '<div class="fabric-layout" style="display:block"><div class="fabric-details">' +
      '<div class="code">' + escapeHtml(fabric.fabric_code || "onlyhers FABRIC") + "</div>" +
      '<h1 class="name">' + escapeHtml(name) + "</h1>" +
      '<div class="price">Retail: ' + escapeHtml(priceText) + "</div>" +
      '<div class="stock ' + (available(fabric.is_available) ? "in" : "out") + '">' + stockText + "</div>" +
      '<p class="fabric-description">' + escapeHtml(fabric.description || "Selected dress fabric from onlyhers.") + "</p>" +
      (fabric.material ? '<p class="fabric-detail-line"><strong>Material:</strong> ' + escapeHtml(fabric.material) + "</p>" : "") +
      (fabric.width ? '<p class="fabric-detail-line"><strong>Width:</strong> ' + escapeHtml(fabric.width) + ' inches</p>' : "") +
      (fabric.pattern ? '<p class="fabric-detail-line"><strong>Pattern:</strong> ' + escapeHtml(fabric.pattern) + "</p>" : "") +
      "</div></div>";

    html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(name) + " | onlyhers Fabrics</title>");
    html = setAttributeById(html, "meta", "metaDescription", "content", description);
    html = setAttributeById(html, "link", "canonicalUrl", "href", canonical);
    html = setAttributeById(html, "meta", "ogTitle", "content", name + " | onlyhers Fabrics");
    html = setAttributeById(html, "meta", "ogDescription", "content", description);
    html = setAttributeById(html, "meta", "ogUrl", "content", canonical);
    html = setAttributeById(html, "meta", "ogImage", "content", cover || "https://onlyhers.in/onlyhers-logo.png");
    html = setAttributeById(html, "meta", "twitterTitle", "content", name + " | onlyhers Fabrics");
    html = setAttributeById(html, "meta", "twitterDescription", "content", description);
    html = setAttributeById(html, "meta", "twitterImage", "content", cover || "https://onlyhers.in/onlyhers-logo.png");
    html = html.replace(
      /(<script type="application\/ld\+json" id="fabricStructuredData">)[\s\S]*?(<\/script>)/i,
      "$1" + schemaText(schema) + "$2"
    );
    html = html.replace('<div class="error">Loading fabric...</div>', content);

    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=0, s-maxage=300");
    headers.delete("content-length");
    return new Response(html, { status: response.status, headers });
  } catch (error) {
    console.error("Fabric server rendering failed", error);
    return response;
  }
}
