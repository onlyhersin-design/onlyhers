import { fabricRow } from "../../../_lib/api.js";
import { adminJson, requireAdmin, cleanText, cleanNumber, cleanArray } from "../../../_lib/admin.js";
function values(body) {
  const images=cleanArray(body.image_urls,10);const imageUrl=cleanText(body.image_url,2000)||images[0]||"";if(imageUrl&&!images.includes(imageUrl))images.unshift(imageUrl);
  return {name:cleanText(body.name,180),description:cleanText(body.description,5000),price:cleanNumber(body.price),fabric_code:cleanText(body.fabric_code,80),
    material:cleanText(body.material,160),width:cleanText(body.width,40),image_url:imageUrl,image_urls:JSON.stringify(images),
    is_available:body.is_available===false||body.is_available==="false"?0:1,pattern:cleanText(body.pattern,100),
    available_meters:Math.floor(cleanNumber(body.available_meters,0)||0),instagram_photo_url:cleanText(body.instagram_photo_url,2000),
    instagram_link:cleanText(body.instagram_link,2000),youtube_photo_url:cleanText(body.youtube_photo_url,2000),
    youtube_link:cleanText(body.youtube_link,2000),wholesale_price:cleanNumber(body.wholesale_price)};
}
export async function onRequestPatch({request,env,params}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;if(!env.DB)return adminJson({error:"Database is not connected."},503);
  const id=String(params.id||"");if(!/^[0-9a-f-]{36}$/i.test(id))return adminJson({error:"Invalid fabric."},400);
  let body;try{body=await request.json();}catch{return adminJson({error:"Invalid fabric details."},400);}
  const v=values(body);if(!v.name)return adminJson({error:"Fabric name is required."},400);
  try{const keys=Object.keys(v);await env.DB.prepare("UPDATE fabrics SET "+keys.map(k=>k+"=?").join(",")+" WHERE id=?").bind(...keys.map(k=>v[k]),id).run();
    const row=await env.DB.prepare("SELECT * FROM fabrics WHERE id=?").bind(id).first();return row?adminJson(fabricRow(row)):adminJson({error:"Fabric not found."},404);
  }catch(error){console.error(error);return adminJson({error:"Could not update this fabric."},500);}
}
export async function onRequestDelete({request,env,params}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;
  const id=String(params.id||"");if(!/^[0-9a-f-]{36}$/i.test(id))return adminJson({error:"Invalid fabric."},400);
  try{const result=await env.DB.prepare("DELETE FROM fabrics WHERE id=?").bind(id).run();return result.meta?.changes?adminJson({ok:true}):adminJson({error:"Fabric not found."},404);}
  catch(error){console.error(error);return adminJson({error:"Could not delete this fabric."},500);}
}
