import { fabricRow } from "../../_lib/api.js";
import { adminJson, requireAdmin, cleanText, cleanNumber, cleanArray } from "../../_lib/admin.js";
function values(body) {
  const images=cleanArray(body.image_urls,10);const imageUrl=cleanText(body.image_url,2000)||images[0]||"";if(imageUrl&&!images.includes(imageUrl))images.unshift(imageUrl);
  return {name:cleanText(body.name,180),description:cleanText(body.description,5000),price:cleanNumber(body.price),fabric_code:cleanText(body.fabric_code,80),
    material:cleanText(body.material,160),width:cleanText(body.width,40),image_url:imageUrl,image_urls:JSON.stringify(images),
    is_available:body.is_available===false||body.is_available==="false"?0:1,pattern:cleanText(body.pattern,100),
    available_meters:Math.floor(cleanNumber(body.available_meters,0)||0),instagram_photo_url:cleanText(body.instagram_photo_url,2000),
    instagram_link:cleanText(body.instagram_link,2000),youtube_photo_url:cleanText(body.youtube_photo_url,2000),
    youtube_link:cleanText(body.youtube_link,2000),wholesale_price:cleanNumber(body.wholesale_price)};
}
const columns=["id","name","description","price","fabric_code","material","width","image_url","image_urls","is_available","created_at","pattern","available_meters","instagram_photo_url","instagram_link","youtube_photo_url","youtube_link","wholesale_price"];
export async function onRequestGet({request,env}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;if(!env.DB)return adminJson({error:"Database is not connected."},503);
  try{const result=await env.DB.prepare("SELECT * FROM fabrics ORDER BY created_at DESC").all();return adminJson((result.results||[]).map(fabricRow));}
  catch(error){console.error(error);return adminJson({error:"Could not load fabrics."},500);}
}
export async function onRequestPost({request,env}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;if(!env.DB)return adminJson({error:"Database is not connected."},503);
  let body;try{body=await request.json();}catch{return adminJson({error:"Invalid fabric details."},400);}
  const v=values(body);if(!v.name)return adminJson({error:"Fabric name is required."},400);v.id=crypto.randomUUID();v.created_at=new Date().toISOString();
  try{await env.DB.prepare("INSERT INTO fabrics ("+columns.join(",")+") VALUES ("+columns.map(()=>"?").join(",")+")").bind(...columns.map(c=>v[c]??null)).run();
    const row=await env.DB.prepare("SELECT * FROM fabrics WHERE id=?").bind(v.id).first();return adminJson(fabricRow(row),201);
  }catch(error){console.error(error);return adminJson({error:"Could not save this fabric."},500);}
}
