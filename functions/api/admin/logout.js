import { adminJson, requireAdmin } from "../../_lib/admin.js";
export async function onRequestPost({request,env}) {
  const auth=await requireAdmin(request,env);
  if(auth.response && auth.response.status!==401) return auth.response;
  return adminJson({ok:true},200,{"set-cookie":"oh_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"});
}
