/* OnlyHers homepage product ordering */
(function () {
  const SUPABASE_URL = 'https://zeodtbgxadxfvexvywpm.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ywvo11SASIHo-oeNZasF0Q__LmK-oxr';
  let clientPromise = null;
  let sortField = 'homepage_order';
  let busy = false;

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
      result = await db.from('products')
        .select('id,name,created_at')
        .order('created_at', { ascending: false });
    } else {
      sortField = 'homepage_order';
    }

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

      const current = products[index];
      const other = products[otherIndex];
      const db = await getClient();
      const field = sortField;
      let currentValue;
      let otherValue;

      if (field === 'homepage_order') {
        currentValue = current.homepage_order;
        otherValue = other.homepage_order;
        if (currentValue == null || otherValue == null) {
          const base = Date.now() * 1000;
          currentValue = base - index * 2;
          otherValue = base - otherIndex * 2;
        }
      } else {
        currentValue = current.created_at;
        otherValue = other.created_at;
      }

      const first = await db.from('products').update({ [field]: otherValue }).eq('id', current.id);
      if (first.error) throw first.error;
      const second = await db.from('products').update({ [field]: currentValue }).eq('id', other.id);
      if (second.error) throw second.error;

      window.location.reload();
    } catch (error) {
      console.error('OnlyHers homepage ordering error:', error);
      alert(`Could not change the homepage order. ${error.message || 'Please try again.'}`);
    } finally {
      busy = false;
    }
  }

  function addAdminControls() {
    const list = document.getElementById('productList');
    if (!list) return;
    injectStyles();

    if (!document.getElementById('oh-home-order-help')) {
      const help = document.createElement('div');
      help.id = 'oh-home-order-help';
      help.className = 'oh-home-order-help';
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
      controls.innerHTML = `
        <button type="button" title="Show this product earlier on the homepage" ${index === 0 ? 'disabled' : ''}>↑ Up</button>
        <button type="button" title="Show this product later on the homepage" ${index === rows.length - 1 ? 'disabled' : ''}>↓ Down</button>
      `;
      controls.children[0].addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        swapProducts(id, 'up');
      });
      controls.children[1].addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        swapProducts(id, 'down');
      });

      const name = row.querySelector('.product-name');
      if (name) {
        const badge = document.createElement('span');
        badge.className = 'oh-order-badge';
        badge.textContent = index === 0 ? 'Top of homepage' : `Homepage #${index + 1}`;
        name.appendChild(badge);
      }

      const actions = row.querySelector('.product-actions');
      if (actions) actions.insertBefore(controls, actions.firstChild);
      else row.appendChild(controls);
    });
  }

  async function arrangeStorefront() {
    const feed = document.getElementById('homeProductsFeed');
    if (!feed) return;
    try {
      const products = await getProducts();
      if (!products.length) return;
      const sections = Array.from(feed.querySelectorAll('.home-product-slide'));
      const byId = new Map();
      sections.forEach(section => {
        const link = section.querySelector('a[href*="product.html?id="]');
        const match = link?.href?.match(/[?&]id=([^&]+)/);
        if (match) byId.set(decodeURIComponent(match[1]), section);
      });
      products.forEach(product => {
        const section = byId.get(String(product.id));
        if (section) feed.appendChild(section);
      });
    } catch (error) {
      console.warn('OnlyHers homepage custom order unavailable:', error);
    }
  }

  function start() {
    const list = document.getElementById('productList');
    if (list) {
      const observer = new MutationObserver(() => addAdminControls());
      observer.observe(list, { childList: true, subtree: true });
      setTimeout(addAdminControls, 250);
    }

    const feed = document.getElementById('homeProductsFeed');
    if (feed) {
      const observer = new MutationObserver(() => {
        if (feed.querySelector('.home-product-slide')) {
          observer.disconnect();
          arrangeStorefront();
        }
      });
      observer.observe(feed, { childList: true, subtree: true });
      setTimeout(arrangeStorefront, 900);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
