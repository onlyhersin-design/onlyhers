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
function available(value) {
  return value !== false && Number(value) !== 0;
}
function setAttributeById(html, tag, id, attribute, value) {
  const pattern = new RegExp("(<" + tag + "\\b[^>]*\\bid=\"" + id + "\"[^>]*\\b" + attribute + "=\")[^\"]*(\")", "i");
  return html.replace(pattern, (_match, before, after) => before + escapeHtml(value) + after);
}
function schemaText(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
function renderProduct(product, images) {
  const name = product.name || "onlyhers design";
  const code = product.product_code || "";
  const category = product.category || "onlyhers collection";
  const description = product.description || "Thoughtfully designed to feel comfortable, personal and uniquely hers.";
  const price = product.price == null || !Number.isFinite(Number(product.price))
    ? "Price on request"
    : "₹" + Number(product.price).toLocaleString("en-IN");
  const stock = available(product.is_available);
  const image = images[0] || "";
  const imageHtml = image
    ? '<div class="main-image-container"><img class="main-image" src="' + escapeHtml(image) +
      '" alt="' + escapeHtml(name) + '"></div>'
    : '<div class="main-image-container" aria-label="No product image available"></div>';
  const sizes = imageList(product.sizes);
  const sizeHtml = sizes.length
    ? '<div class="size-title">Available sizes</div><div class="sizes">' +
      sizes.map(size => '<span class="size-btn">' + escapeHtml(size) + "</span>").join("") + "</div>"
    : "";
  const material = product.material
    ? '<p class="product-detail-text"><strong>Material:</strong> ' + escapeHtml(product.material) + "</p>"
    : "";
  const care = product.wash_care
    ? '<p class="product-detail-text"><strong>Care:</strong> ' + escapeHtml(product.wash_care) + "</p>"
    : "";

  return '<div class="product-container"><div class="gallery">' + imageHtml +
    '</div><div class="product-details"><div class="product-label-row"><div class="product-category">' +
    escapeHtml(category) + "</div>" + (code ? '<div class="product-code">Code: ' + escapeHtml(code) + "</div>" : "") +
    '</div><h1 class="product-name">' + escapeHtml(name) + "</h1>" +
    '<div class="product-price">' + escapeHtml(price) + "</div>" +
    '<div class="stock-status ' + (stock ? "in-stock" : "out-of-stock") + '">' +
    (stock ? "In Stock" : "Out of Stock") + "</div>" +
    '<div class="product-line"></div><p class="product-description">' + escapeHtml(description) + "</p>" +
    sizeHtml + material + care + "</div></div>";
}

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
    const product = await context.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    let html = await response.text();
    if (!product) {
      html = html.replace(
        '<meta name="robots" content="index, follow, max-image-preview:large">',
        '<meta name="robots" content="noindex, follow">'
      );
      return new Response(html, { status: response.status, headers: response.headers });
    }

    const images = [...new Set([
      product.image_url,
      ...imageList(product.image_urls),
      product.instagram_photo_url,
      product.youtube_photo_url
    ].filter(value => typeof value === "string" && /^https?:\/\//i.test(value)))];
    const canonical = "https://onlyhers.in/product.html?id=" + id;
    const name = product.name || "onlyhers design";
    const description = String(product.description || "Thoughtfully designed to feel comfortable, personal and uniquely hers.").replace(/\s+/g, " ").slice(0, 160);
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": canonical + "#product",
      "url": canonical,
      "name": name,
      "description": product.description || "Thoughtfully designed to feel comfortable, personal and uniquely hers.",
      ...(images.length ? { "image": images } : {}),
      "sku": product.product_code || String(id),
      "brand": { "@type": "Brand", "name": "onlyhers" },
      ...(product.category ? { "category": product.category } : {}),
      ...(product.material ? { "material": product.material } : {}),
      ...(Number(product.price) > 0 ? {
        "offers": {
          "@type": "Offer",
          "url": canonical,
          "priceCurrency": "INR",
          "price": Number(product.price).toFixed(2),
          "availability": available(product.is_available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "itemCondition": "https://schema.org/NewCondition",
          "seller": { "@type": "Organization", "name": "onlyhers", "url": "https://onlyhers.in/" }
        }
      } : {})
    };

    html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(name) + " | onlyhers</title>");
    html = setAttributeById(html, "meta", "metaDescription", "content", description);
    html = setAttributeById(html, "link", "canonicalUrl", "href", canonical);
    html = setAttributeById(html, "meta", "ogTitle", "content", name + " | onlyhers");
    html = setAttributeById(html, "meta", "ogDescription", "content", description);
    html = setAttributeById(html, "meta", "ogUrl", "content", canonical);
    html = setAttributeById(html, "meta", "ogImage", "content", images[0] || "https://onlyhers.in/onlyhers-logo.png");
    html = setAttributeById(html, "meta", "twitterTitle", "content", name + " | onlyhers");
    html = setAttributeById(html, "meta", "twitterDescription", "content", description);
    html = setAttributeById(html, "meta", "twitterImage", "content", images[0] || "https://onlyhers.in/onlyhers-logo.png");
    html = html.replace(
      /(<script type="application\/ld\+json" id="productStructuredData">)[\s\S]*?(<\/script>)/i,
      "$1" + schemaText(schema) + "$2"
    );
    html = html.replace(
      '<div class="loading">\n        Loading your piece...\n      </div>',
      renderProduct(product, images)
    );

    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=0, s-maxage=300");
    headers.delete("content-length");
    return new Response(html, { status: response.status, headers });
  } catch (error) {
    console.error("Product server rendering failed", error);
    return response;
  }
}
