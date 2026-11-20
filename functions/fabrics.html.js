const SITE = "https://onlyhers.in";
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
function renderFabric(fabric) {
  const name = fabric.name || "onlyhers fabric";
  const images = imageList(fabric.image_urls);
  const cover = fabric.image_url || images[0] || "";
  const retail = fabric.price == null ? "Price on request" : "₹" + Number(fabric.price).toLocaleString("en-IN") + " / metre";
  const wholesale = fabric.wholesale_price == null ? "" : "₹" + Number(fabric.wholesale_price).toLocaleString("en-IN") + " / metre (10m+)";
  const photo = cover
    ? '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(name) + '" loading="lazy">'
    : "";
  return '<a class="fabric-card" data-fabric-index="" href="/fabric.html?id=' + encodeURIComponent(fabric.id) +
    '" style="display:block;color:inherit;text-decoration:none"><div class="fabric-image">' + photo +
    '</div><div class="fabric-info"><div class="fabric-code">' + escapeHtml(fabric.fabric_code || "onlyhers FABRIC") +
    '</div><h2 class="fabric-name">' + escapeHtml(name) + '</h2>' +
    (fabric.pattern ? '<div class="fabric-code">' + escapeHtml(fabric.pattern) + '</div>' : "") +
    '<div class="fabric-price">Retail: ' + escapeHtml(retail) + '</div>' +
    (wholesale ? '<div class="fabric-price" style="margin-top:6px;font-size:12px;opacity:.85">Wholesale: ' + escapeHtml(wholesale) + '</div>' : "") +
    '<div class="fabric-meters">' + (Number.isFinite(Number(fabric.available_meters)) ? "Available: " + Number(fabric.available_meters) + " metres" : "") + '</div>' +
    '<div class="fabric-stock ' + (fabric.is_available === false || Number(fabric.is_available) === 0 ? "out-stock" : "in-stock") + '">' +
    (fabric.is_available === false || Number(fabric.is_available) === 0 ? "Out of Stock" : "In Stock") +
    "</div></div></a>";
}
function schemaText(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }

export async function onRequest(context) {
  const response = await context.next();
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html") || !context.env.DB) return response;
  try {
    const result = await context.env.DB.prepare("SELECT * FROM fabrics ORDER BY created_at DESC").all();
    const fabrics = result.results || [];
    const schema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Dress Fabrics by the Metre | onlyhers",
      "url": SITE + "/fabrics.html",
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": fabrics.map((fabric, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": fabric.name || "Fabric",
          "url": SITE + "/fabric.html?id=" + encodeURIComponent(fabric.id)
        }))
      }
    };

    let html = await response.text();
    const placeholder = '<div class="fabric-loading">Loading fabrics...</div>';
    const cards = fabrics.length
      ? fabrics.map(renderFabric).join("")
      : '<div class="fabric-loading">No fabrics are available at the moment.</div>';
    html = html.replace(placeholder, cards);
    html = html.replace(
      /(<script type="application\\/ld\\+json" id="fabricListStructuredData">)[\\s\\S]*?(<\\/script>)/i,
      "$1" + schemaText(schema) + "$2"
    );

    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=0, s-maxage=300");
    headers.delete("content-length");
    return new Response(html, { status: response.status, headers });
  } catch (error) {
    console.error("Fabrics server rendering failed", error);
    return response;
  }
}
