/* OnlyHers homepage product ordering + temporary festive banner */
(function () {
  const SUPABASE_URL = 'https://zeodtbgxadxfvexvywpm.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ywvo11SASIHo-oeNZasF0Q__LmK-oxr';
  let clientPromise = null;
  let sortField = 'homepage_order';
  let busy = false;

  function removeFestiveCloseButton() {
    document.querySelectorAll('.onlyhers-festival-close, .oh-festive-close').forEach(button => button.remove());
  }

  /* Temporary homepage-only Vinayaka Chaturthi banner. It automatically
     disappears after 14 September 2026 (India/local browser date). */
  function addFestiveBanner() {
    if (!document.body) return;
    removeFestiveCloseButton();
    if (document.getElementById('onlyhers-festive-banner')) return;

    const indiaDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    if (indiaDate !== '2026-09-14') return;

    const homePage = document.body.classList.contains('home-page') ||
      !!document.getElementById('homeProductsFeed');
    if (!homePage) return;

    const style = document.createElement('style');
    style.id = 'onlyhers-festive-banner-style';
    style.textContent = `
      #onlyhers-festive-banner {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 999999 !important;
        width: 100%;
        box-sizing: border-box;
        padding: 9px 16px;
        text-align: center;
        background: linear-gradient(90deg, rgba(38,0,5,.98), rgba(125,5,18,.98), rgba(38,0,5,.98));
        border-bottom: 1px solid rgba(255,215,150,.25);
        color: #fff7ed;
        font-family: inherit;
        letter-spacing: .02em;
        line-height: 1.35;
        box-shadow: 0 2px 12px rgba(0,0,0,.35);
      }
      #onlyhers-festive-banner .oh-festive-title { font-size: 14px; font-weight: 700; }
      #onlyhers-festive-banner .oh-festive-note { margin-left: 6px; font-size: 11px; opacity: .86; }
      .onlyhers-festival-close, .oh-festive-close { display: none !important; }
      body.home-page .navbar { top: 39px !important; }
      @media (max-width: 600px) {
        #onlyhers-festive-banner { padding: 8px 10px; }
        #onlyhers-festive-banner .oh-festive-title { font-size: 13px; }
        #onlyhers-festive-banner .oh-festive-note { display: block; margin: 1px 0 0; font-size: 10px; }
        body.home-page .navbar { top: 47px !important; }
      }
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'onlyhers-festive-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <span class="oh-festive-title">🪷 Happy Vinayaka Chaturthi 🪷</span>
      <span class="oh-festive-note">Wishing you happiness, prosperity & new beginnings.</span>
    `;

    document.body.prepend(banner);
  }

  async function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY));
    return clientPromise;
  }

  async function getProducts() {
    const db = await getClient();
    let result = await db.from('products')
      .select('id,name,created_at,homepage_order')
      .order('homepage_order', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (result.error) {
      sortField = 'created_at';
      result = await db.from('products').select('id,name,created_at').order('created_at', { ascending: false });
    } else sortField = 'homepage_order';
    if (result.error) throw result.error;
    return result.data || [];
  }

  function injectStyles() {
    if (document.getElementById('onlyhers-home-order-style')) return;
    const style = document.createElement('style');
    style.id = 'onlyhers-home-order-style';
    style.textContent = `
      .oh-home-order-help{font-size:12px;color:#666;margin:-8px 0 16px;line-height:1.5}
      .oh-home-order{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
      .oh-home-order button{border:1px solid #aaa;background:#fff;color:#333;padding:7px 10px;font:600 11px/1 inherit;cursor:pointer}
      .oh-home-order button:hover{background:#a8242e;color:#fff;border-color:#a8242e}
      .oh-home-order button:disabled{opacity:.45;cursor:not-allowed}
      .oh-order-badge{display:inline-block;margin-left:7px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#a8242e;font-weight:700}
      @media(max-width:700px){.oh-home-order{grid-column:2}.oh-home-order button{padding:7px 9px}}
    `;
    document.head.appendChild(style);
  }

  async function swapProducts(id, direction) {
    if (busy) return;
    busy = true;
    try {
      const products = await getProducts();
      const index = products.findIndex(p => String(p.id) === String(id));
      const otherIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || otherIndex < 0 || otherIndex >= products.length) return;
      const current = products[index], other = products[otherIndex];
      const db = await getClient(), field = sortField;
      let currentValue, otherValue;
      if (field === 'homepage_order') {
        currentValue = current.homepage_order; otherValue = other.homepage_order;
        if (currentValue == null || otherValue == null) {
          const base = Date.now() * 1000;
          currentValue = base - index * 2; otherValue = base - otherIndex * 2;
        }
      } else { currentValue = current.created_at; otherValue = other.created_at; }
      const first = await db.from('products').update({ [field]: otherValue }).eq('id', current.id);
      if (first.error) throw first.error;
      const second = await db.from('products').update({ [field]: currentValue }).eq('id', other.id);
      if (second.error) throw second.error;
      window.location.reload();
    } catch (error) {
      console.error('OnlyHers homepage ordering error:', error);
      alert(`Could not change the homepage order. ${error.message || 'Please try again.'}`);
    } finally { busy = false; }
  }

  function addAdminControls() {
    const list = document.getElementById('productList');
    if (!list) return;
    injectStyles();
    if (!document.getElementById('oh-home-order-help')) {
      const help = document.createElement('div');
      help.id = 'oh-home-order-help'; help.className = 'oh-home-order-help';
      help.textContent = 'Homepage order: new additions appear at the top automatically. Use ↑ / ↓ to choose exactly where each product appears.';
      list.parentElement?.insertBefore(help, list);
    }
    const rows = Array.from(list.querySelectorAll('.product'));
    rows.forEach((row, index) => {
      if (row.querySelector('.oh-home-order')) return;
      const edit = row.querySelector('[data-edit]');
      if (!edit) return;
      const id = edit.dataset.edit;
      const controls = document.createElement('div');
      controls.className = 'oh-home-order';
      controls.innerHTML = `<button type="button" title="Show this product earlier on the homepage" ${index === 0 ? 'disabled' : ''}>↑ Up</button><button type="button" title="Show this product later on the homepage" ${index === rows.length - 1 ? 'disabled' : ''}>↓ Down</button>`;
      controls.children[0].addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); swapProducts(id, 'up'); });
      controls.children[1].addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); swapProducts(id, 'down'); });
      const name = row.querySelector('.product-name');
      if (name) {
        const badge = document.createElement('span'); badge.className = 'oh-order-badge';
        badge.textContent = index === 0 ? 'Top of homepage' : `Homepage #${index + 1}`; name.appendChild(badge);
      }
      const actions = row.querySelector('.product-actions');
      if (actions) actions.insertBefore(controls, actions.firstChild); else row.appendChild(controls);
    });
  }

  async function arrangeStorefront() {
    const feed = document.getElementById('homeProductsFeed');
    if (!feed) return;
    try {
      const products = await getProducts(); if (!products.length) return;
      const sections = Array.from(feed.querySelectorAll('.home-product-slide')), byId = new Map();
      sections.forEach(section => {
        const link = section.querySelector('a[href*="product.html?id="]');
        const match = link?.href?.match(/[?&]id=([^&]+)/);
        if (match) byId.set(decodeURIComponent(match[1]), section);
      });
      products.forEach(product => { const section = byId.get(String(product.id)); if (section) feed.appendChild(section); });
    } catch (error) { console.warn('OnlyHers homepage custom order unavailable:', error); }
  }

  function start() {
    addFestiveBanner();
    removeFestiveCloseButton();
    const list = document.getElementById('productList');
    if (list) {
      const observer = new MutationObserver(() => { removeFestiveCloseButton(); addAdminControls(); });
      observer.observe(list, { childList: true, subtree: true });
      setTimeout(addAdminControls, 250);
    }
    const feed = document.getElementById('homeProductsFeed');
    if (feed) {
      const observer = new MutationObserver(() => {
        if (feed.querySelector('.home-product-slide')) { observer.disconnect(); arrangeStorefront(); }
      });
      observer.observe(feed, { childList: true, subtree: true });
      setTimeout(arrangeStorefront, 900);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
