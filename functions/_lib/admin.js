const encoder = new TextEncoder();
function toB64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign","verify"]);
}
function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
export function adminJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...extraHeaders}
  });
}
export async function createAdminCookie(email, env) {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  const payload = toB64Url(encoder.encode(JSON.stringify({email,exp:Math.floor(Date.now()/1000)+60*60*8})));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const token = payload + "." + toB64Url(new Uint8Array(signature));
  return "oh_admin=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800";
}
export async function getAdmin(request, env) {
  if (!env.SESSION_SECRET) return null;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)oh_admin=([^;]+)/);
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length !== 2) return null;
  try {
    const key = await hmacKey(env.SESSION_SECRET);
    const valid = await crypto.subtle.verify("HMAC", key, fromB64Url(parts[1]), encoder.encode(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(parts[0])));
    const allowedEmail = String(env.ADMIN_EMAIL || "onlyhers.in@gmail.com").toLowerCase();
    if (!payload || payload.email !== allowedEmail || !Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}
export async function requireAdmin(request, env) {
  if (!isSameOrigin(request)) return {response:adminJson({error:"Invalid request origin."},403)};
  const admin = await getAdmin(request, env);
  return admin ? {admin} : {response:adminJson({error:"Please sign in to continue."},401)};
}
export function cleanText(value, max = 3000) {
  return typeof value === "string" ? value.trim().slice(0,max) : "";
}
export function cleanNumber(value, fallback = null) {
  if (value === "" || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
export function cleanArray(value, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item)=>String(item).trim().slice(0,500)).filter(Boolean))].slice(0,maxItems);
}
