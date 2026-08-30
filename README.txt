ONLYHERS SHOP + DASHBOARD SETUP

FILES
- products.html  -> public shop page
- admin.html     -> private dashboard
- supabase-setup.sql -> database setup

WHY SUPABASE?
GitHub Pages is static hosting. It cannot securely accept image uploads or store products by itself.
Supabase provides:
- secure login
- database
- image storage
- a real dashboard workflow

SETUP
1. Create a free project at https://supabase.com
2. Open SQL Editor and run supabase-setup.sql
3. In Storage, create a bucket named: product-images
   Turn ON "Public bucket".
4. In Authentication > Users, create your own admin user.
5. Go to Project Settings > API and copy:
   - Project URL
   - anon public key
6. Paste both values into BOTH products.html and admin.html:
   SUPABASE_URL
   SUPABASE_ANON_KEY
7. Upload products.html and admin.html to your GitHub repository.
8. Add this link to your index.html navigation:
   <a href="products.html">Shop</a>

IMPORTANT SECURITY NOTE
Never put your Supabase SERVICE_ROLE key into these HTML files.
Only use the anon/public key.

ORDER FLOW
Customer:
1. Opens products.html
2. Selects a size
3. Clicks "Order on WhatsApp"
4. WhatsApp opens with the dress name, selected size, price and product ID prefilled.

ADMIN
Open:
https://onlyhers.in/admin.html

Keep that URL private, but the real protection is the Supabase email/password login.
