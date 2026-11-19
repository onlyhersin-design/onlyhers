(() => {
  const $=id=>document.getElementById(id);
  let activeTab="products",products=[],fabrics=[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=v=>v==null?"—":"₹"+Number(v).toLocaleString("en-IN");
  async function api(path,options={}) {
    const response=await fetch("/api"+path,{...options,credentials:"same-origin",headers:{"content-type":"application/json",...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Request failed ("+response.status+")");
    return data;
  }
  function message(text,isError=false){$("dashboard-message").textContent=text;$("dashboard-message").style.color=isError?"#ffd0d0":"#f3d4c2";}
  function showLogin(){ $("login-view").hidden=false;$("dashboard-view").hidden=true; }
  function showDashboard(){ $("login-view").hidden=true;$("dashboard-view").hidden=false; }
  async function checkSession(){
    try{const state=await api("/admin/session",{headers:{}});if(state.authenticated){showDashboard();await reload();}else showLogin();}
    catch(e){showLogin();$("login-message").textContent=e.message;}
  }
  $("login-form").addEventListener("submit",async e=>{
    e.preventDefault();$("login-message").textContent="Signing in…";
    try{await api("/admin/login",{method:"POST",body:JSON.stringify({email:$("login-email").value,password:$("login-password").value})});$("login-password").value="";showDashboard();await reload();}
    catch(err){$("login-message").textContent=err.message;}
  });
  $("logout-button").addEventListener("click",async()=>{try{await api("/admin/logout",{method:"POST",body:"{}"});}catch{}showLogin();});
  document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{
    activeTab=button.dataset.tab;document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===button));
    $("product-panel").hidden=activeTab!=="products";$("fabric-panel").hidden=activeTab!=="fabrics";
    $("list-heading").textContent=activeTab==="products"?"Products":"Fabrics";renderList();
  }));
  async function reload(){
    try{[products,fabrics]=await Promise.all([api("/admin/products"),api("/admin/fabrics")]);renderList();message("Catalogue loaded. Add, edit or remove items below.");}
    catch(e){message(e.message,true);if(e.message.toLowerCase().includes("sign in"))showLogin();}
  }
  function renderList(){
    const items=activeTab==="products"?products:fabrics;$("list-count").textContent=items.length+" items";
    $("catalogue-list").innerHTML=items.length?items.map(item=>{
      const id=activeTab==="products"?item.id:item.id;
      return '<div class="admin-row"><div><strong>'+esc(item.name)+'</strong><small>'+esc(activeTab==="products"?(item.product_code||item.category||"Product"):(item.fabric_code||item.material||"Fabric"))+' · '+money(item.price)+(activeTab==="fabrics"?' / metre':'')+' · '+(item.is_available?"Available":"Out of stock")+'</small></div><div class="row-actions"><button class="small-button" data-edit="'+esc(id)+'">Edit</button><button class="small-button danger" data-delete="'+esc(id)+'">Delete</button></div></div>';
    }).join(""):'<div class="empty-state">No '+activeTab+' added yet. Use the form above to add your first one.</div>';
    $("catalogue-list").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>activeTab==="products"?editProduct(b.dataset.edit):editFabric(b.dataset.edit)));
    $("catalogue-list").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteItem(b.dataset.delete)));
  }
  function resetProduct(){ $("product-form").reset();$("product-id").value="";$("product-section").value="onlyhers_designs";$("product-save").textContent="Add product"; }
  function resetFabric(){ $("fabric-form").reset();$("fabric-id").value="";$("fabric-save").textContent="Add fabric"; }
  $("product-reset").addEventListener("click",resetProduct);$("fabric-reset").addEventListener("click",resetFabric);
  function lines(s){return String(s||"").split(/\r?\n/).map(v=>v.trim()).filter(Boolean);}
  async function uploadSelectedFiles(inputId,folder,imageId,galleryId,statusId){
    const input=$(inputId),status=$(statusId),cover=$(imageId),gallery=$(galleryId);
    const files=Array.from(input.files||[]);
    if(!files.length)return;
    if(files.length>10){status.textContent="Please choose up to 10 photos at a time.";input.value="";return;}
    input.disabled=true;
    const previousCover=cover.value.trim();
    const uploaded=[];
    try{
      for(let i=0;i<files.length;i++){
        status.textContent="Uploading photo "+(i+1)+" of "+files.length+"…";
        const form=new FormData();
        form.append("file",files[i],files[i].name);
        form.append("folder",folder);
        const response=await fetch("/api/admin/upload",{method:"POST",body:form,credentials:"same-origin"});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"Could not upload "+files[i].name);
        if(!data.url)throw new Error("The upload completed but no image URL was returned.");
        uploaded.push(data.url);
      }
      const nextCover=uploaded[0]||previousCover;
      const existingGallery=lines(gallery.value);
      const combined=[...uploaded.slice(1),...(previousCover&&previousCover!==nextCover?[previousCover]:[]),...existingGallery];
      const unique=[...new Set(combined.filter(url=>url&&url!==nextCover))].slice(0,9);
      cover.value=nextCover;
      gallery.value=unique.join("\n");
      status.textContent=uploaded.length+" photo"+(uploaded.length===1?"":"s")+" uploaded. First photo set as cover; remaining photos added to gallery. Save the product to publish the changes.";
    }catch(error){
      status.textContent=error.message;
      status.style.color="#ffd0d0";
    }finally{
      input.disabled=false;
      input.value="";
    }
  }
  $("product-upload").addEventListener("change",()=>uploadSelectedFiles("product-upload","products","product-image","product-gallery","product-upload-status"));
  $("fabric-upload").addEventListener("change",()=>uploadSelectedFiles("fabric-upload","fabrics","fabric-image","fabric-gallery","fabric-upload-status"));
  function productPayload(){
    const image=$("product-image").value.trim();const urls=[image,...lines($("product-gallery").value)].filter(Boolean);
    return {name:$("product-name").value,product_code:$("product-code").value,price:$("product-price").value,category:$("product-category").value,material:$("product-material").value,
      collection_section:$("product-section").value,sizes:$("product-sizes").value.split(",").map(s=>s.trim()).filter(Boolean),image_url:image,image_urls:urls,
      description:$("product-description").value,wash_care:$("product-care").value,more_details:$("product-extra").value,size_chart_url:$("product-chart").value,instagram_link:$("product-instagram-link").value.trim(),
      is_available:$("product-available").value==="true"};
  }
  $("product-form").addEventListener("submit",async e=>{
    e.preventDefault();const id=$("product-id").value;const button=$("product-save");button.disabled=true;
    try{await api("/admin/products"+(id?"/"+encodeURIComponent(id):""),{method:id?"PATCH":"POST",body:JSON.stringify(productPayload())});resetProduct();await reload();message(id?"Product updated.":"Product added.");}
    catch(err){message(err.message,true);}finally{button.disabled=false;}
  });
  function editProduct(id){
    const p=products.find(x=>String(x.id)===String(id));if(!p)return;
    $("product-id").value=p.id;$("product-name").value=p.name||"";$("product-code").value=p.product_code||"";$("product-price").value=p.price??"";
    $("product-category").value=p.category||"";$("product-material").value=p.material||"";$("product-section").value=p.collection_section||"onlyhers_designs";
    $("product-sizes").value=(p.sizes||[]).join(", ");$("product-image").value=p.image_url||"";
    $("product-gallery").value=(p.image_urls||[]).filter(x=>x!==p.image_url).join("\n");$("product-description").value=p.description||"";
    $("product-care").value=p.wash_care||"";$("product-extra").value=p.more_details||"";$("product-chart").value=p.size_chart_url||"";$("product-instagram-link").value=p.instagram_link||"";
    $("product-available").value=p.is_available?"true":"false";$("product-save").textContent="Save changes";$("product-form").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function fabricPayload(){
    const image=$("fabric-image").value.trim();const urls=[image,...lines($("fabric-gallery").value)].filter(Boolean);
    return {name:$("fabric-name").value,fabric_code:$("fabric-code").value,price:$("fabric-price").value,wholesale_price:$("fabric-wholesale").value,
      material:$("fabric-material").value,width:$("fabric-width").value,pattern:$("fabric-pattern").value,available_meters:$("fabric-meters").value,
      image_url:image,image_urls:urls,is_available:$("fabric-available").value==="true",description:$("fabric-description").value,instagram_link:$("fabric-instagram-link").value.trim()};
  }
  $("fabric-form").addEventListener("submit",async e=>{
    e.preventDefault();const id=$("fabric-id").value;const button=$("fabric-save");button.disabled=true;
    try{await api("/admin/fabrics"+(id?"/"+encodeURIComponent(id):""),{method:id?"PATCH":"POST",body:JSON.stringify(fabricPayload())});resetFabric();await reload();message(id?"Fabric updated.":"Fabric added.");}
    catch(err){message(err.message,true);}finally{button.disabled=false;}
  });
  function editFabric(id){
    const f=fabrics.find(x=>String(x.id)===String(id));if(!f)return;
    $("fabric-id").value=f.id;$("fabric-name").value=f.name||"";$("fabric-code").value=f.fabric_code||"";$("fabric-price").value=f.price??"";
    $("fabric-wholesale").value=f.wholesale_price??"";$("fabric-material").value=f.material||"";$("fabric-width").value=f.width||"";
    $("fabric-pattern").value=f.pattern||"";$("fabric-meters").value=f.available_meters??"";$("fabric-image").value=f.image_url||"";$("fabric-instagram-link").value=f.instagram_link||"";
    $("fabric-gallery").value=(f.image_urls||[]).filter(x=>x!==f.image_url).join("\n");$("fabric-available").value=f.is_available?"true":"false";$("fabric-description").value=f.description||"";
    $("fabric-save").textContent="Save changes";$("fabric-form").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function deleteItem(id){
    const item=(activeTab==="products"?products:fabrics).find(x=>String(x.id)===String(id));
    if(!item||!confirm('Delete "'+item.name+'"? This cannot be undone.'))return;
    try{await api("/admin/"+activeTab+"/"+encodeURIComponent(id),{method:"DELETE"});await reload();message("Item deleted.");}
    catch(e){message(e.message,true);}
  }
  checkSession();
})();