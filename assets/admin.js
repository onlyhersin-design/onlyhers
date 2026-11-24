(() => {
  const $=id=>document.getElementById(id);
  let activeTab="products",products=[],fabrics=[],sizeCharts=[];
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
    $("product-panel").hidden=activeTab!=="products";$("fabric-panel").hidden=activeTab!=="fabrics";$("size-charts-panel").hidden=activeTab!=="size-charts";
    $("list-heading").textContent=activeTab==="products"?"Products":activeTab==="fabrics"?"Fabrics":"Size Charts";if(activeTab==="size-charts")renderSizeCharts();else renderList();
  }));
  async function reload(){
    try {
      const [productResult, fabricResult] = await Promise.all([
        api("/admin/products"),
        api("/admin/fabrics")
      ]);
      products = Array.isArray(productResult) ? productResult : [];
      fabrics = Array.isArray(fabricResult) ? fabricResult : [];
      renderList();
      message("Products and fabrics loaded. Add, edit or remove catalogue items below.");

      // Size charts are an optional admin feature. If their migration has not
      // been applied yet, it must not prevent the existing catalogue loading.
      try {
        const chartResult = await api("/admin/size-charts");
        sizeCharts = chartResult.sizeCharts || [];
        renderSizeCharts();
      } catch (chartError) {
        sizeCharts = [];
        renderSizeCharts();
        console.warn("Size charts could not be loaded:", chartError);
      }
    } catch(e) {
      message(e.message, true);
      if (e.message.toLowerCase().includes("sign in")) showLogin();
    }
  }
  function productOrder(a,b){
    const aFeatured=String(a.product_code||"").toUpperCase()==="DTG01";
    const bFeatured=String(b.product_code||"").toUpperCase()==="DTG01";
    if(aFeatured!==bFeatured)return aFeatured?-1:1;
    return Number(b.homepage_order||0)-Number(a.homepage_order||0) || String(b.created_at||"").localeCompare(String(a.created_at||""));
  }
  async function moveProduct(id,direction){
    const ordered=[...products].sort(productOrder);
    const index=ordered.findIndex(item=>String(item.id)===String(id));
    const next=index+(direction==="up"?-1:1);
    if(index<1||next<1||next>=ordered.length)return;
    const moving=ordered.splice(index,1)[0];
    ordered.splice(next,0,moving);
    const controls=$("catalogue-list").querySelectorAll("[data-move]");
    controls.forEach(button=>button.disabled=true);
    try{
      await api("/admin/reorder-products",{method:"POST",body:JSON.stringify({ids:ordered.map(item=>Number(item.id))})});
      products=ordered;
      await reload();
      message("Homepage design order saved.");
    }catch(error){
      message(error.message||"Could not save the homepage order.",true);
      controls.forEach(button=>button.disabled=false);
    }
  }
  function renderList(){
    const items=activeTab==="products"?[...products].sort(productOrder):fabrics;
    $("list-count").textContent=items.length+" items";
    $("catalogue-list").innerHTML=items.length?items.map((item,index)=>{
      const id=item.id;
      const isProduct=activeTab==="products";
      const featured=isProduct&&String(item.product_code||"").toUpperCase()==="DTG01";
      const position=featured?" · Featured first":(isProduct?" · Homepage #"+(index+1):"");
      const orderControls=isProduct
        ? '<button type="button" class="small-button" data-move="up" data-id="'+esc(id)+'" aria-label="Move '+esc(item.name)+' up" title="Move up" '+(featured||index===1?'disabled':'')+'>↑</button><button type="button" class="small-button" data-move="down" data-id="'+esc(id)+'" aria-label="Move '+esc(item.name)+' down" title="Move down" '+(index===items.length-1?'disabled':'')+'>↓</button>'
        : "";
      return '<div class="admin-row"><div><strong>'+esc(item.name)+'</strong><small>'+esc(isProduct?(item.product_code||item.category||"Product"):(item.fabric_code||item.material||"Fabric"))+' · '+money(item.price)+(activeTab==="fabrics"?' / metre':'')+' · '+(item.is_available?"Available":"Out of stock")+position+'</small></div><div class="row-actions">'+orderControls+'<button class="small-button" data-edit="'+esc(id)+'">Edit</button><button class="small-button danger" data-delete="'+esc(id)+'">Delete</button></div></div>';
    }).join(""):'<div class="empty-state">No '+activeTab+' added yet. Use the form above to add your first one.</div>';
    $("catalogue-list").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>activeTab==="products"?editProduct(b.dataset.edit):editFabric(b.dataset.edit)));
    $("catalogue-list").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteItem(b.dataset.delete)));
    $("catalogue-list").querySelectorAll("[data-move]").forEach(b=>b.addEventListener("click",()=>moveProduct(b.dataset.id,b.dataset.move)));
  }
  const chartTypes=["Tops","Short Tops","Dresses","Maxi Dress","Trousers","Coord Sets"];
  function renderSizeCharts(){
    const host=$("size-chart-list");if(!host)return;
    host.innerHTML=chartTypes.map(type=>{
      const chart=sizeCharts.find(item=>item.garment_type===type);
      return '<div class="admin-row"><div><strong>'+esc(type)+'</strong><small>'+(chart?'Chart uploaded · Updated '+new Date(chart.updated_at).toLocaleDateString():'No chart uploaded yet')+'</small></div><div class="row-actions">'+(chart?'<a class="small-button" href="'+esc(chart.image_url)+'" target="_blank" rel="noopener">View</a>':'<span class="count-label">Pending</span>')+'</div></div>';
    }).join("");
  }
  $("chart-upload").addEventListener("change",async()=>{
    const file=$("chart-upload").files?.[0];if(!file)return;
    const status=$("chart-upload-status");status.textContent="Uploading size chart…";
    const form=new FormData();form.append("file",file,file.name);form.append("folder","size-charts");
    const input=$("chart-upload");input.disabled=true;
    try{
      const response=await fetch("/api/admin/upload",{method:"POST",body:form,credentials:"same-origin"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Could not upload size chart.");
      $("chart-image-url").value=data.url;
      $("chart-image-preview").src=data.url;$("chart-image-preview").hidden=false;
      status.textContent="Image uploaded. Choose the garment type and save the chart.";
    }catch(error){status.textContent=error.message;}
    finally{input.disabled=false;input.value="";}
  });
  $("chart-save").addEventListener("click",async()=>{
    const status=$("chart-save-status"),button=$("chart-save");
    const imageUrl=$("chart-image-url").value.trim();
    if(!imageUrl){status.textContent="Please upload a size chart image first.";return;}
    button.disabled=true;status.textContent="Saving shared size chart…";
    try{
      await api("/admin/size-charts",{method:"POST",body:JSON.stringify({garment_type:$("chart-garment-type").value,image_url:imageUrl})});
      const result=await api("/admin/size-charts");sizeCharts=result.sizeCharts||[];renderSizeCharts();
      status.textContent=$("chart-garment-type").value+" size chart saved. It is now stored centrally for this garment type.";
    }catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  });
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
    const current=products.find(item=>String(item.id)===String($("product-id").value));
    return {homepage_order:current?.homepage_order,name:$("product-name").value,product_code:$("product-code").value,price:$("product-price").value,category:$("product-category").value,material:$("product-material").value,
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
    const categorySelect=$("product-category");const existingCategory=String(p.category||"");if(existingCategory&&!Array.from(categorySelect.options).some(option=>option.value===existingCategory)){const option=document.createElement("option");option.value=existingCategory;option.textContent=existingCategory;categorySelect.insertBefore(option,categorySelect.lastElementChild);}categorySelect.value=existingCategory;$("product-material").value=p.material||"";$("product-section").value=p.collection_section||"onlyhers_designs";
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
  const clearImagesButton = $("clear-old-images");
  const clearImagesStatus = $("clear-image-status");
  clearImagesButton?.addEventListener("click", async () => {
    const confirmed = confirm(
      "Clear every existing product and fabric photo link from the live catalogue? " +
      "Product and fabric records, descriptions, prices, sizes, stock and social links will remain. " +
      "This cannot be undone."
    );
    if (!confirmed) return;

    clearImagesButton.disabled = true;
    clearImagesStatus.textContent = "Clearing old image links...";
    try {
      const result = await api("/admin/clear-images", {
        method: "POST",
        body: JSON.stringify({ confirm: "CLEAR_IMAGES" })
      });
      clearImagesStatus.textContent =
        "Done. Cleared image links for " + result.productsCleared +
        " products and " + result.fabricsCleared + " fabrics. Catalogue details were preserved.";
      await reload();
    } catch (error) {
      clearImagesStatus.textContent = error.message || "Could not clear old image links.";
    } finally {
      clearImagesButton.disabled = false;
    }
  });

  checkSession();
})();