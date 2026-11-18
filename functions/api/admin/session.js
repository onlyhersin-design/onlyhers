import { adminJson, getAdmin } from "../../_lib/admin.js";
export async function onRequestGet({request,env}) {
  const admin=await getAdmin(request,env);
  return adminJson({authenticated:Boolean(admin),email:admin?.email||null});
}
