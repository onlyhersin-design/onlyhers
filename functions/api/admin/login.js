import { adminJson, createAdminCookie } from "../../_lib/admin.js";
export async function onRequestPost({request,env}) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return adminJson({error:"Admin login is not configured yet. Add ADMIN_PASSWORD and SESSION_SECRET in Cloudflare Pages secrets."},503);
  const origin=request.headers.get("Origin");
  if (origin) { try { if(new URL(origin).host!==new URL(request.url).host)return adminJson({error:"Invalid request origin."},403); } catch { return adminJson({error:"Invalid request origin."},403); } }
  let body;try{body=await request.json();}catch{return adminJson({error:"Enter your email and password."},400);}
  const email=String(body.email||"").trim().toLowerCase();
  const password=String(body.password||"");
  const allowed=String(env.ADMIN_EMAIL||"onlyhers.in@gmail.com").trim().toLowerCase();
  if(email!==allowed||password!==env.ADMIN_PASSWORD)return adminJson({error:"Email or password is incorrect."},401);
  try {
    const cookie=await createAdminCookie(allowed,env);
    return adminJson({ok:true,email:allowed},200,{"set-cookie":cookie});
  }catch(error){console.error("Admin session error",error);return adminJson({error:"Could not start an admin session."},500);}
}
