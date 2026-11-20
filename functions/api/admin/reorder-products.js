import { adminJson, requireAdmin } from "../../_lib/admin.js";

export async function onRequestPost({request,env}) {
  const auth=await requireAdmin(request,env);
  if(auth.response)return auth.response;
  if(!env.DB)return adminJson({error:"Database is not connected."},503);

  let body;
  try{body=await request.json();}catch{return adminJson({error:"Invalid order."},400);}
  if(!Array.isArray(body.ids)||body.ids.length>500)return adminJson({error:"Please send a valid product order."},400);

  const ids=body.ids.map(Number);
  if(ids.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(ids).size!==ids.length)
    return adminJson({error:"The product order contains invalid or duplicate IDs."},400);

  try{
    const current=await env.DB.prepare("SELECT id, product_code FROM products").all();
    const rows=current.results||[];
    const existingIds=rows.map(row=>Number(row.id)).sort((a,b)=>a-b);
    const submittedIds=[...ids].sort((a,b)=>a-b);
    if(existingIds.length!==submittedIds.length||existingIds.some((id,index)=>id!==submittedIds[index]))
      return adminJson({error:"The catalogue changed. Refresh the page and try again."},409);

    const featured=rows.find(row=>String(row.product_code||"").toUpperCase()==="DTG01");
    if(featured&&ids[0]!==Number(featured.id))
      return adminJson({error:"The Dual Tone Green Dress stays featured at the top."},400);

    const base=Date.now()*1000;
    const updates=ids.map((id,index)=>
      env.DB.prepare("UPDATE products SET homepage_order=? WHERE id=?").bind(base-index,id)
    );
    if(updates.length)await env.DB.batch(updates);
    return adminJson({ok:true,count:ids.length});
  }catch(error){
    console.error("Product order update failed",error);
    return adminJson({error:"Could not save the homepage order."},500);
  }
}
