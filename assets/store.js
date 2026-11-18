(() => {
  const API = "/api";
  const WA = "919059828206";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = (value) => value == null || value === "" ? "Price on request" : "₹" + Number(value).toLocaleString("en-IN");
  const image = (url, alt, cls="") => url ? '<img class="'+cls+'" src="'+esc(url)+'" alt="'+esc(alt)+'" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-failed\')">' : '<div class="image-placeholder">OnlyHers</div>';
  async function get(path) {
    const response = await fetch(API + path, {headers:{accept:"application/json"}});
    if (!response.ok) throw new Error("Request failed (" + response.status + ")");
    return response.json();
  }
  function productCard(p) {
    return '<a class="product-card" href="/product.html?id='+encodeURIComponent(p.id)+'"><div class="product-image">'+image(p.image_url, p.name)+'</div><div class="product-meta"><div class="product-code">'+esc(p.product_code || p.category || "ONLYHERS")+'</div><h3 class="product-name">'+esc(p.name)+'</h3><div class="product-price">'+money(p.price)+'</div>'+(p.material?'<div class="product-tag">'+esc(p.material)+'</div>':'')+'</div></a>';
  }
  function fabricCard(f) {
    return '<a class="fabric-card" href="/fabric.html?id='+encodeURIComponent(f.id)+'"><div class="fabric-image">'+image(f.image_url, f.name)+'</div><div class="fabric-meta"><div class="product-code">'+esc(f.fabric_code || "ONLYHERS FABRIC")+'</div><h3 class="fabric-name">'+esc(f.name)+'</h3><div class="fabric-price">'+money(f.price)+' <span style="font-weight:400">/ metre</span></div><div class="product-tag">'+esc(f.material || "")+(f.width ? " · "+esc(f.width)+'" width' : "")+'</div></div></a>';
  }
  function empty(message) { return '<div class="empty-state">'+esc(message)+'</div>'; }
  async function loadHome() {
    const target=$("home-products"); if(!target)return;
    try { const items=await get("/products"); target.innerHTML=items.length?items.slice(0,6).map(productCard).join(""):empty("Our first collection is taking shape. New designs are coming soon."); }
    catch(e){console.error(e);target.innerHTML=empty("We couldn't load the designs just now. Please refresh.");}
  }
  async function loadCollection() {
    const target=$("product-grid"); if(!target)return;
    const params=new URLSearchParams(location.search), section=params.get("section")||"all";
    const labels={all:"All Collections",onlyhers_designs:"OnlyHers Designs",customisations:"Customisations",recreations:"Recreations"};
    const title=$("page-title"); if(title)title.textContent=labels[section]||"Our Collection";
    const intro=$("page-description"); if(intro)intro.textContent=section==="customisations"?"Personal touches and thoughtful details, made more you.":section==="recreations"?"Inspiration-led pieces recreated with an OnlyHers touch.":"Explore pieces designed to bring a little more her to your wardrobe.";
    try {
      const items=await get("/products"+(section!=="all"?"?section="+encodeURIComponent(section):""));
      if($("result-count"))$("result-count").textContent=items.length+" pieces";
      if(!items.length){target.innerHTML=empty("No pieces here just yet. Check back soon, or message us on WhatsApp.");return;}
      target.innerHTML=items.map(productCard).join("");
      const search=$("catalogue-search");
      if(search)search.addEventListener("input",()=>{const term=search.value.toLowerCase().trim();const filtered=items.filter(p=>(p.name+" "+(p.category||"")+" "+(p.material||"")+" "+(p.product_code||"")).toLowerCase().includes(term));target.innerHTML=filtered.length?filtered.map(productCard).join(""):empty("No designs match that search.");if($("result-count"))$("result-count").textContent=filtered.length+" pieces";});
    } catch(e){console.error(e);target.innerHTML=empty("We couldn't load the collection just now.");}
  }
  async function loadProduct() {
    const target=$("product-detail"); if(!target)return;
    const id=new URLSearchParams(location.search).get("id");
    if(!id){target.innerHTML=empty("Choose a design from the collection to see its details.");return;}
    try {
      const p=await get("/products/"+encodeURIComponent(id));
      document.title=(p.name||"Product")+" | OnlyHers";
      const images=Array.isArray(p.image_urls)?p.image_urls:[];const cover=p.image_url||images[0]||"";
      const sizes=Array.isArray(p.sizes)?p.sizes:[];
      target.innerHTML='<div class="detail-media"><div class="detail-main-image">'+(cover?image(cover,p.name):'<div class="image-placeholder">OnlyHers</div>')+'</div></div><div class="detail-copy"><a class="back-link" href="/collection.html">← Back to collections</a><div class="detail-code">'+esc(p.product_code||p.category||"ONLYHERS DESIGN")+'</div><h1>'+esc(p.name)+'</h1><div class="detail-price">'+money(p.price)+'</div><div class="detail-description">'+esc(p.description||"Thoughtfully designed by OnlyHers.")+'</div><div class="detail-facts">'+(p.material?'<div class="fact"><span>Fabric</span><strong>'+esc(p.material)+'</strong></div>':'')+(p.wash_care?'<div class="fact"><span>Care</span><strong>'+esc(p.wash_care)+'</strong></div>':'')+(p.more_details?'<div class="fact"><span>More details</span><strong>'+esc(p.more_details).replace(/\n/g,"<br>")+'</strong></div>':'')+'<div class="fact"><span>Availability</span><strong>'+(p.is_available?"Made to order / available":"Currently unavailable")+'</strong></div></div><div class="order-panel"><label for="size-choice">Choose your size</label><select id="size-choice"><option value="">Select a size</option>'+(sizes.length?sizes.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join(""):'<option value="Custom size">Custom size / discuss</option>')+'</select><button class="button" id="whatsapp-order" type="button">Enquire on WhatsApp ↗</button><p class="notice">Orders and customisation enquiries are handled directly on WhatsApp. Prepaid orders only.</p></div></div>';
      $("whatsapp-order").addEventListener("click",()=>{const size=$("size-choice").value;if(!size){$("size-choice").focus();return;}const message="Hi OnlyHers! I’m interested in "+p.name+" ("+(p.product_code||"")+") in size "+size+". Please share the details for placing a prepaid order.";window.open("https://wa.me/"+WA+"?text="+encodeURIComponent(message),"_blank","noopener");});
    } catch(e){console.error(e);target.innerHTML=empty("This design could not be found. Please return to the collection.");}
  }
  async function loadFabrics() {
    const target=$("fabric-grid"); if(!target)return;let all=[];
    try {all=await get("/fabrics");const draw=(list)=>{if($("result-count"))$("result-count").textContent=list.length+" fabrics";target.innerHTML=list.length?list.map(fabricCard).join(""):empty("No fabrics found. Please check back soon.");};draw(all);
      const search=$("catalogue-search");if(search)search.addEventListener("input",()=>{const t=search.value.toLowerCase().trim();draw(all.filter(f=>(f.name+" "+(f.material||"")+" "+(f.fabric_code||"")+" "+(f.pattern||"")).toLowerCase().includes(t));});
    }catch(e){console.error(e);target.innerHTML=empty("We couldn't load fabrics just now.");}
  }
  async function loadFabric() {
    const target=$("fabric-detail");if(!target)return;const id=new URLSearchParams(location.search).get("id");if(!id){target.innerHTML=empty("Choose a fabric from the fabrics page.");return;}
    try{const f=await get("/fabrics/"+encodeURIComponent(id));document.title=(f.name||"Fabric")+" | OnlyHers";
      const img=f.image_url||((f.image_urls||[])[0]||"");
      target.innerHTML='<div class="detail-media"><div class="detail-main-image">'+(img?image(img,f.name):'<div class="image-placeholder">OnlyHers Fabrics</div>')+'</div></div><div class="detail-copy"><a class="back-link" href="/fabrics.html">← Back to fabrics</a><div class="detail-code">'+esc(f.fabric_code||"ONLYHERS FABRIC")+'</div><h1>'+esc(f.name)+'</h1><div class="detail-price">'+money(f.price)+' / metre</div><div class="detail-description">'+esc(f.description||"Selected fabric from OnlyHers.")+'</div><div class="detail-facts"><div class="fact"><span>Material</span><strong>'+esc(f.material||"—")+'</strong></div><div class="fact"><span>Width</span><strong>'+(f.width?esc(f.width)+' inches':"—")+'</strong></div><div class="fact"><span>Pattern</span><strong>'+esc(f.pattern||"—")+'</strong></div><div class="fact"><span>Available</span><strong>'+(f.available_meters!=null?esc(f.available_meters)+" metres":"Enquire")+'</strong></div></div><div class="order-panel"><label for="meters">Quantity (metres)</label><input type="number" id="meters" min="1" max="'+(Number(f.available_meters)||999)+'" value="1"><button class="button" id="fabric-enquire" type="button">Enquire on WhatsApp ↗</button><p class="notice">Wholesale pricing may be available for bulk quantities. Message us to confirm availability and shipping. Prepaid orders only.</p></div></div>';
      $("fabric-enquire").addEventListener("click",()=>{const metres=Math.max(1,Number($("meters").value)||1);const msg="Hi OnlyHers! I’m interested in "+f.name+" ("+(f.fabric_code||"")+") for "+metres+" metre(s). Please share availability and order details.";window.open("https://wa.me/"+WA+"?text="+encodeURIComponent(msg),"_blank","noopener");});
    }catch(e){console.error(e);target.innerHTML=empty("This fabric could not be found.");}
  }
  window.OnlyHers={loadHome,loadCollection,loadProduct,loadFabrics,loadFabric};
})();