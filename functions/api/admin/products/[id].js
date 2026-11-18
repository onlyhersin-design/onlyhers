import { productRow } from "../../../_lib/api.js";
import { adminJson, requireAdmin, cleanText, cleanNumber, cleanArray } from "../../../_lib/admin.js";
function values(body) {
  const sizes=cleanArray(body.sizes,20),images=cleanArray(body.image_urls,10),imageUrl=cleanText(body.image_url,2000)||images[0]||"";
  if(imageUrl&&!images.includes(imageUrl))images.unshift(imageUrl);
  return {
    name:cleanText(body.name,180),description:cleanText(body.description,5000),price:cleanNumber(body.price),image_url:imageUrl,
    sizes:JSON.stringify(sizes),category:cleanText(body.category,100),is_available:body.is_available===false||body.is_available==="false"?0:1,
    image_urls:JSON.stringify(images),product_code:cleanText(body.product_code,80),size_chart_url:cleanText(body.size_chart_url,2000),
    material:cleanText(body.material,160),wash_care:cleanText(body.wash_care,300),more_details:cleanText(body.more_details,2000),
    homepage_order:cleanNumber(body.homepage_order,Date.now()),instagram_photo_url:cleanText(body.instagram_photo_url,2000),
    instagram_link:cleanText(body.instagram_link,2000),youtube_photo_url:cleanText(body.youtube_photo_url,2000),
    youtube_link:cleanText(body.youtube_link,2000),
    collection_section:["onlyhers_designs","customisations","recreations"].includes(body.collection_section)?body.collection_section:"onlyhers_designs"
  };
}
export async function onRequestPatch({request,env,params}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;
  if(!env.DB)return adminJson({error:"Database is not connected."},503);
  const id=Number(params.id);if(!Number.isSafeInteger(id)||id<=0)return adminJson({error:"Invalid product."},400);
  let body;try{body=await request.json();}catch{return adminJson({error:"Invalid product details."},400);}
  const v=values(body);if(!v.name)return adminJson({error:"Product name is required."},400);
  try{
    const keys=Object.keys(v);await env.DB.prepare("UPDATE products SET "+keys.map(k=>k+"=?").join(",")+" WHERE id=?").bind(...keys.map(k=>v[k]),id).run();
    const row=await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(id).first();return row?adminJson(productRow(row)):adminJson({error:"Product not found."},404);
  }catch(error){console.error(error);return adminJson({error:"Could not update this product."},500);}
}
export async function onRequestDelete({request,env,params}) {
  const auth=await requireAdmin(request,env);if(auth.response)return auth.response;
  const id=Number(params.id);if(!Number.isSafeInteger(id)||id<=0)return adminJson({error:"Invalid product."},400);
  try{const result=await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();return result.meta?.changes?adminJson({ok:true}):adminJson({error:"Product not found."},404);}
  catch(error){console.error(error);return adminJson({error:"Could not delete this product."},500);}
}
