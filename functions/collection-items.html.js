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
function price(value) {
  return value == null || !Number.isFinite(Number(value))
    ? "Price on request"
    : "₹" + Number(value).toLocaleString("en-IN");
}
function schemaText(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
const sections = {
  onlyhers_designs: {
    title: "onlyhers Designs",
    eyebrow: "DESIGNED BY onlyhers",
    description: "Explore original women's dresses, tops and co-ord sets thoughtfully designed by onlyhers.",
    kind: "product"
  },
  customisations: {
    title: "Customisations",
    eyebrow: "MADE MORE YOU",
    description: "Discover women's clothing designs that can be personalised to suit your style and preferences.",
    kind: "product"
  },
  recreations: {
    title: "Recreations",
    eyebrow: "INSPIRED BY YOUR IDEAS",
    description: "Explore inspiration-led women's fashion and recreated styles with an onlyhers touch.",
    kind: "product"
  },
  fabrics: {
    title: "Fabrics",
    eyebrow: "CHOOSE YOUR MATERIAL",
    description: "Shop selected dress fabrics by the metre for your own clothing and creative projects.",
    kind: "fabric"
  },
  all: {
    title: "Shop All Collection",
    eyebrow: "THE FULL COLLECTION",
    description: "Browse all original onlyhers designs, customisations, recreations and selected fabrics in one place.",
    kind: "all"
  }
};
function renderItem(item, kind) {
  const isFabric = kind === "fabric";
  const name = item.name || (isFabric ? "onlyhers fabric" : "onlyhers design");
  const images = imageList(item.image_urls);
  const image = item.image_url || images[0] || item.image || "";
  const category = isFabric
    ? (item.material || item.pattern || "Fabric")
    : (item.category || "onlyhers");
  const cost = isFabric
    ? (item.price == null ? "Price on request" : price(item.price) + " / metre")
    : price(item.price);
  const href = (isFabric ? "/fabric.html?id=" : "/product.html?id=") + encodeURIComponent(item.id);
  return '<a class="item" href="' + href + '"><div class="photo">' +
    (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '" loading="lazy">' : "") +
    '</div><div class="info"><div class="category">' + escapeHtml(category) +
    '</div><div class="name">' + escapeHtml(name) + '</div><div class="price">' +
    escapeHtml(cost) + "</div></div></a>";
}
function setText(html, id, value) {
  const pattern = new RegExp('(<[^>]+\\bid="' + id + '"[^>]*>)[\s\S]*?(<\\/[^>]+>)', "i");
  return html.replace(pattern, (_match, before, after) => before + escapeHtml(value) + after);
}
function setAttribute(html, id, attribute, value) {
  const pattern = new RegExp('(<(?:meta|link)\\b[^>]*\\bid="' + id + '"[^>]*\\b' + attribute + '=")[^"]*(")', "i");
  return html.replace(pattern, (_match, before, after) => before + escapeHtml(value) + after);
}

export async function onRequest(context) {
  const response = await context.next();
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html") || !context.env.DB) return response;

  try {
    const url = new URL(context.request.url);
    const requested = url.searchParams.get("section") || "all";
    const key = sections[requested] ? requested : "all";
    const selected = sections[key];
    let items = [];

    if (selected.kind === "fabric") {
      const result = await context.env.DB.prepare("SELECT * FROM fabrics ORDER BY created_at DESC").all();
      items = result.results || [];
    } else {
      let statement;
      if (selected.kind === "all") {
        statement = context.env.DB.prepare("SELECT * FROM products ORDER BY homepage_order DESC, created_at DESC");
      } else {
        statement = context.env.DB.prepare("SELECT * FROM products WHERE collection_section = ? ORDER BY homepage_order DESC, created_at DESC").bind(key);
      }
      const result = await statement.all();
      items = result.results || [];
    }

    const canonical = key === "fabrics"
      ? SITE + "/fabrics.html"
      : SITE + "/collection-items.html" + (key === "all" ? "" : "?section=" + encodeURIComponent(key));
    const pageUrl = canonical;
    const itemList = items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name || (selected.kind === "fabric" ? "Fabric" : "Design"),
      "url": SITE + (selected.kind === "fabric" ? "/fabric.html?id=" : "/product.html?id=") + encodeURIComponent(item.id)
    }));
    const schema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": selected.title,
      "description": selected.description,
      "url": pageUrl,
      "isPartOf": { "@type": "WebSite", "name": "onlyhers", "url": SITE + "/" },
      "mainEntity": { "@type": "ItemList", "itemListElement": itemList }
    };

    let html = await response.text();
    html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(selected.title) + " | onlyhers</title>");
    html = setAttribute(html, "metaDescription", "content", selected.description);
    html = setAttribute(html, "canonicalUrl", "href", canonical);
    html = setAttribute(html, "ogTitle", "content", selected.title + " | onlyhers");
    html = setAttribute(html, "ogDescription", "content", selected.description);
    html = setAttribute(html, "ogUrl", "content", canonical);
    html = setAttribute(html, "twitterTitle", "content", selected.title + " | onlyhers");
    html = setAttribute(html, "twitterDescription", "content", selected.description);
    html = setText(html, "pageTitle", selected.title);
    html = setText(html, "eyebrow", selected.eyebrow);
    html = setText(html, "pageDescription", selected.description);
    html = html.replace(
      /(<script type="application\/ld\+json" id="collectionStructuredData">)[\s\S]*?(<\/script>)/i,
      "$1" + schemaText(schema) + "$2"
    );
    const placeholder = '<div class="empty">Loading collection…</div>';
    const rendered = items.length
      ? items.map(item => renderItem(item, selected.kind === "fabric" ? "fabric" : "product")).join("")
      : '<div class="empty">There are no items in this section yet. Please check back soon.</div>';
    html = html.replace(placeholder, rendered);

    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=0, s-maxage=300");
    headers.delete("content-length");
    return new Response(html, { status: response.status, headers });
  } catch (error) {
    console.error("Collection server rendering failed", error);
    return response;
  }
}
