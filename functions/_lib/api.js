export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=60, s-maxage=300, stale-while-revalidate=600" : "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export function parseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function productRow(row) {
  if (!row) return row;
  return {
    ...row,
    is_available: Boolean(row.is_available),
    sizes: parseJson(row.sizes, []),
    image_urls: parseJson(row.image_urls, [])
  };
}

export function fabricRow(row) {
  if (!row) return row;
  return {
    ...row,
    is_available: Boolean(row.is_available),
    image_urls: parseJson(row.image_urls, [])
  };
}
