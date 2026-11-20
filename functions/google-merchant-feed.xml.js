const SITE = "https://onlyhers.in";
const xml = (value) => String(value ?? "").replace(/[<>&'"]/g, character => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
}[character]));

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return new Response("Product feed is temporarily unavailable.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }

  try {
    const result = await env.DB.prepare(
      "SELECT id, name, description, price, image_url, product_code, category, is_available FROM products ORDER BY homepage_order DESC, created_at DESC"
    ).all();

    const items = (result.results || []).filter(product =>
      Number.isSafeInteger(Number(product.id)) &&
      String(product.name || "").trim() &&
      /^https?:\/\//i.test(String(product.image_url || "")) &&
      Number.isFinite(Number(product.price)) &&
      Number(product.price) > 0
    ).map(product => {
      const available = Number(product.is_available) !== 0;
      const productUrl = SITE + "/product.html?id=" + Number(product.id);
      const description = String(product.description || product.name).slice(0, 5000);
      return [
        "<item>",
        "<g:id>" + xml(product.id) + "</g:id>",
        "<g:title>" + xml(product.name).slice(0, 150) + "</g:title>",
        "<g:description>" + xml(description) + "</g:description>",
        "<g:link>" + xml(productUrl) + "</g:link>",
        "<g:image_link>" + xml(product.image_url) + "</g:image_link>",
        "<g:availability>" + (available ? "in_stock" : "out_of_stock") + "</g:availability>",
        "<g:price>" + Number(product.price).toFixed(2) + " INR</g:price>",
        "<g:brand>onlyhers</g:brand>",
        "<g:condition>new</g:condition>",
        "<g:identifier_exists>no</g:identifier_exists>",
        product.category ? "<g:product_type>" + xml(product.category) + "</g:product_type>" : "",
        product.product_code ? "<g:mpn>" + xml(product.product_code) + "</g:mpn>" : "",
        "</item>"
      ].join("");
    });

    const feed = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>' +
      "<title>onlyhers product catalogue</title>" +
      "<link>" + SITE + "/</link>" +
      "<description>Women's clothing, dresses, co-ord sets and designs from onlyhers.</description>" +
      items.join("") +
      "</channel></rss>";

    return new Response(feed, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=3600",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    console.error("Google Merchant product feed failed", error);
    return new Response("Product feed is temporarily unavailable.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
}
