# POINTERS Official Store

The React storefront uses the prices in `dcs-pricelist.xlsx`, supports tee, lanyard, pin, keychain, and sticker designs, and includes Bundle Sets A–D. Product images are loaded from `src/assets/`; a visible placeholder is shown until an image is added.

## Run locally

```sh
npm install
npm run dev
```

Create a local `.env` file with the Supabase project URL and publishable/anon key:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

The browser key is a publishable key protected by the database policies. Never put a Supabase service-role key in this frontend or commit `.env`.

## Create the database

1. Open the project's Supabase Dashboard and select **SQL Editor**.
2. For a fresh database, run [`supabase/migrations/202610060001_store_schema.sql`](./supabase/migrations/202610060001_store_schema.sql).
3. If `store_products` already exists but is missing catalog columns or `store_product_variants`, first run [`supabase/migrations/202610060002_catalog_sort_order.sql`](./supabase/migrations/202610060002_catalog_sort_order.sql), then run `202610060001_store_schema.sql` to finish setting up order submission and admin access. The repair migration seeds catalog designs without changing existing orders.
4. Run [`supabase/migrations/202610060003_payment_methods.sql`](./supabase/migrations/202610060003_payment_methods.sql) to allow only GCash and cash over the counter for new reservations.
5. The schema migration creates and seeds `store_products`, `store_product_variants`, `store_orders`, and `store_order_items`, leaving any older generic `products` or `orders` tables untouched. It calculates prices on the database and enables row-level security. Public users can read active store products and submit orders only through the validation function. Student contact details and orders are readable only by designated admins.
6. In **Authentication → Users**, create an admin account. Copy its user UUID and run this in SQL Editor:

   ```sql
   insert into public.store_admins (user_id)
   values ('PASTE-AUTH-USER-UUID-HERE');
   ```

7. Open `/` in the browser and use the **ADMIN** link in the footer. Sign in with that Supabase Auth account to view orders or change order status.

If the database is not configured or the migration has not been run, the storefront uses the spreadsheet-based fallback catalog. It does not display a successful order receipt unless the reservation is actually saved.

## Payment options

Customers can choose GCash or cash over the counter. Selecting GCash displays the supplied QR code and account details (R.H.A · +639641120052). Cash over the counter is paid in person.

## Spreadsheet prices

| Item | Individual price | Bundle prices |
| --- | ---: | --- |
| T-shirt | ₱349 | A ₱340 · B ₱329 · C ₱324 · D ₱329 |
| Lanyard | ₱100 | A ₱100 · B ₱90 · C ₱90 · D ₱90 |
| Pins | ₱35 | A ₱33 · B ₱30 |
| Keychain | ₱15 | A ₱15 · C ₱15 |
| Stickers | ₱15 | A ₱11 |
| Bundle Set A | — | ₱499 (regular item total ₱514) |
| Bundle Set B | — | ₱449 (regular item total ₱484) |
| Bundle Set C | — | ₱429 (regular item total ₱464) |
| Bundle Set D | — | ₱419 (regular item total ₱449) |

The bundle component prices above are shown as defined by the workbook; checkout uses each set's listed total, not a recomputed sum. Each bundle card has a separate design selector for every included item (and a tee size selector); the selected component designs are saved with the order for admin review. Shirt sizes offered are S, M, L, and XL.

## Product image assets

Product artwork already supplied in `src/assets/` is wired into the catalog:

- `Tshirt_1.jpeg`–`Tshirt_4.jpeg`: tee versions A–D.
- `IDLace_2.jpeg` and `IDLace_1.jpeg`: lanyard versions A and B.
- `pins.png`, `keychains.png`, and `Stickers.jpeg`: design sheets for the selectable badge, keychain, and sticker designs.
- `pointers cover page.png`: storefront hero and bundle imagery.
- `logo.jpg`: POINTERS mark.

Images are resolved from `src/assets/` by filename (without extension), so new artwork can be added there and connected by changing its `image_path` in the product variant records. A local placeholder appears if an image is missing.

## Build and lint

```sh
npm run build
npm run lint
```
