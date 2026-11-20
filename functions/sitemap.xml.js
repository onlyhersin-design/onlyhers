const SITE = "https://onlyhers.in";

function urlEntry(path, priority = "0.7", frequency = "weekly") {
  return "<url><loc>" + SITE + path + "</loc><changefreq>" + frequency +
    "</changefreq><priority>" + priority + "</priority></url>";
}

export async function onRequestGet({ env }) {
  const entries = [
    urlEntry("/", "1.0", "daily"),
    urlEntry("/collection.html", "0.9", "weekly"),
    urlEntry("/collection-items.html", "0.9", "daily"),
    urlEntry("/collection-items.html?section=onlyhers_designs", "0.9", "daily"),
    urlEntry("/collection-items.html?section=customisations", "0.8", "weekly"),
    urlEntry("/collection-items.html?section=recreations", "0.8", "weekly"),
    urlEntry("/fabrics.html", "0.8", "daily"),
    urlEntry("/about.html", "0.6", "monthly"),
    urlEntry("/return-policy.html", "0.3", "monthly")
  ];

  try {
    if (env.DB) {
      const [products, fabrics] = await Promise.all([
        env.DB.prepare("SELECT id FROM products ORDER BY id").all(),
        env.DB.prepare("SELECT id FROM fabrics ORDER BY id").all()
      ]);

      for (const row of products.results || []) {
        const id = Number(row.id);
        if (Number.isSafeInteger(id) && id > 0) {
          entries.push(urlEntry("/product.html?id=" + id, "0.8", "weekly"));
        }
      }

      for (const row of fabrics.results || []) {
        const id = Number(row.id);
        if (Number.isSafeInteger(id) && id > 0) {
          entries.push(urlEntry("/fabric.html?id=" + id, "0.7", "weekly"));
        }
      }
    }
  } catch (error) {
    console.error("Dynamic sitemap catalogue lookup failed", error);
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    entries.join("") +
    "</urlset>";

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
      "x-content-type-options": "nosniff"
    }
  });
}
