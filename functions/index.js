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
  } catch {
    return [];
  }
}

function homepageCard(product, index) {
  const images = imageList(product.image_urls);
  const cover = product.image_url || images[0] || "";
  const photo = cover
    ? '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(product.name) +
      '" loading="' + (index === 0 ? "eager" : "lazy") + '" decoding="async"' +
      (index === 0 ? ' fetchpriority="high"' : "") + ">"
    : '<div class="home-design-no-image" aria-hidden="true"></div>';
  const price = product.price == null
    ? "Price on request"
    : "₹" + Number(product.price).toLocaleString("en-IN");

  return '<article class="home-design-item"><a class="home-design-link" href="/product.html?id=' +
    encodeURIComponent(product.id) + '"><div class="home-design-image">' + photo +
    '</div></a><div class="home-design-meta"><h2>' + escapeHtml(product.name) +
    '</h2><span>' + escapeHtml(price) + "</span></div></article>";
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function onRequest(context) {
  const response = await context.next();
  if (!response.ok || !context.env.DB) return response;
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;

  try {
    const result = await context.env.DB.prepare(
      "SELECT id, name, product_code, price, image_url, image_urls, homepage_order, created_at FROM products ORDER BY homepage_order DESC, created_at DESC"
    ).all();
    const products = (result.results || []).sort((a, b) => {
      const aFeatured = String(a.product_code || "").toUpperCase() === "DTG01";
      const bFeatured = String(b.product_code || "").toUpperCase() === "DTG01";
      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
      return Number(b.homepage_order || 0) - Number(a.homepage_order || 0);
    });

    const html = await response.text();
    const target = '<div class="home-design-loading" aria-hidden="true"></div>';
    const cards = products.length
      ? products.map(homepageCard).join("")
      : '<div class="empty-state">Our designs will appear here soon.</div>';

    let output = html.replace(target, cards);
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Women's clothing designs from onlyhers",
      "itemListElement": products.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": product.name || "onlyhers design",
        "url": "https://onlyhers.in/product.html?id=" + encodeURIComponent(product.id)
      }))
    };
    const schemaTag = '<script type="application/ld+json" id="homeProductListStructuredData">' +
      jsonForHtml(itemList) + "</script>";
    output = output.replace("</head>", schemaTag + "</head>");

    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=0, s-maxage=300");
    headers.delete("content-length");
    return new Response(output, { status: response.status, headers });
  } catch (error) {
    console.error("Homepage server rendering failed", error);
    return response;
  }
}
