import { productRow } from "../../_lib/api.js";
import { adminJson, requireAdmin, cleanText, cleanNumber, cleanArray } from "../../_lib/admin.js";
function values(body) {
  const sizes=cleanArray(body.sizes,20);
  const images=cleanArray(body.image_urls,10);
  const imageUrl=cleanText(body.image_url,2000)||images[0]||"";
  if(imageUrl&&!images.includes(imageUrl)) images.unshift(imageUrl);
  const section=["onlyhers_designs","customisations","recreations"].includes(body.collection_section)?body.collection_section:"onlyhers_designs";
  return {
    name:cleanText(body.name,180),description:cleanText(body.description,5000),price:cleanNumber(body.price),
    image_url:imageUrl,sizes:JSON.stringify(sizes),category:cleanText(body.category,100),is_available:body.is_available===false||body.is_available==="false"?0:1,
    image_urls:JSON.stringify(images),product_code:cleanText(body.product_code,80),size_chart_url:cleanText(body.size_chart_url,2000),
    material:cleanText(body.material,160),wash_care:cleanText(body.wash_care,300),more_details:cleanText(body.more_details,2000),
    homepage_order:cleanNumber(body.homepage_order,Date.now()),instagram_photo_url:cleanText(body.instagram_photo_url,2000),
    instagram_link:cleanText(body.instagram_link,2000),youtube_photo_url:cleanText(body.youtube_photo_url,2000),
    youtube_link:cleanText(body.youtube_link,2000),collection_section:section
  };
}
const columns=["created_at","name","description","price","image_url","sizes","category","is_available","image_urls","product_code","size_chart_url","material","wash_care","more_details","homepage_order","instagram_photo_url","instagram_link","youtube_photo_url","youtube_link","collection_section"];
export async function onRequestGet({request,env}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;
  if(!env.DB)return adminJson({error:"Database is not connected."},503);
  try{const result=await env.DB.prepare("SELECT * FROM products ORDER BY CASE WHEN UPPER(product_code)='DTG01' THEN 0 ELSE 1 END ASC, homepage_order DESC, created_at DESC").all();return adminJson((result.results||[]).map(productRow));}
  catch(error){console.error(error);return adminJson({error:"Could not load products."},500);}
}
export async function onRequestPost({request,env}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;
  if(!env.DB)return adminJson({error:"Database is not connected."},503);
  let body;try{body=await request.json();}catch{return adminJson({error:"Invalid product details."},400);}
  const v=values(body);if(!v.name)return adminJson({error:"Product name is required."},400);
  try {
    const names=columns.join(",");const placeholders=columns.map(()=>"?").join(",");
    const params=[new Date().toISOString(),...columns.slice(1).map(c=>v[c])];
    const result=await env.DB.prepare("INSERT INTO products ("+names+") VALUES ("+placeholders+")").bind(...params).run();
    const id=Number(result.meta?.last_row_id);const row=await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(id).first();
    return adminJson(productRow(row),201);
  }catch(error){console.error(error);return adminJson({error:"Could not save this product."},500);}
}
