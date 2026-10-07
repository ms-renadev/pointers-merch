# POINTERS Official Store

The React storefront uses the prices in `dcs-pricelist.xlsx`, supports T-Shirt, lanyard, pin, keychain, and sticker designs, and includes Bundle Sets A–D. Product images are loaded from `src/assets/`; a visible placeholder is shown until an image is added.

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
5. Run [`supabase/migrations/202610060004_checkout_details_and_proofs.sql`](./supabase/migrations/202610060004_checkout_details_and_proofs.sql) to save college information and require private GCash payment proof uploads.
6. Run [`supabase/migrations/202610060005_store_order_item_variant.sql`](./supabase/migrations/202610060005_store_order_item_variant.sql) to fix order saves for existing databases with a required `variant` field.
7. Run [`supabase/migrations/202610060006_store_order_item_price.sql`](./supabase/migrations/202610060006_store_order_item_price.sql) to populate the required legacy `price` column from the validated unit price.
8. Run [`supabase/migrations/202610060007_order_receipts_and_payment_repair.sql`](./supabase/migrations/202610060007_order_receipts_and_payment_repair.sql) to repair legacy item-price/variant fields, restore the private payment-proof bucket and policies, and update the order RPC to return the saved itemized order. This final repair migration is also required for checkout to save the itemized student receipt.
9. Run [`supabase/migrations/202610080001_admin_usernames_and_roles.sql`](./supabase/migrations/202610080001_admin_usernames_and_roles.sql) to add the admin username and role columns used by the admin sign-in and role permissions.
10. The schema migration creates and seeds `store_products`, `store_product_variants`, `store_orders`, and `store_order_items`, leaving any older generic `products` or `orders` tables untouched. It calculates prices on the database and enables row-level security. Public users can read active store products and submit orders only through the validation function. Student contact details and orders are readable only by designated admins.
11. In **Authentication → Users**, create an Auth user for each account email below if it does not already exist. Set its password in Supabase; do not insert users or passwords into `auth.users` using SQL.

   | Role | Username | Auth email |
   | --- | --- | --- |
   | Secretariat | `secretariat_admin` | `secretariat_admin@pointers.internal` |
   | Executive | `pvpadmin` | `pvpadmin@pointers.internal` |
   | Finance | `financecommittee` | `financecommittee@pointers.internal` |
   | Assistant | `assistantofficer` | `assistantofficer@pointers.internal` |

12. After creating the Auth users, run this once in Supabase SQL Editor. It checks that every listed email exists before adding/updating their admin mapping and role:

   ```sql
   do $$
   declare
     missing_emails text;
   begin
     select string_agg(admin.email, ', ')
     into missing_emails
     from (values
       ('secretariat_admin', 'secretariat_admin@pointers.internal', 'secretariat'),
       ('pvpadmin', 'pvpadmin@pointers.internal', 'executive'),
       ('financecommittee', 'financecommittee@pointers.internal', 'finance'),
       ('assistantofficer', 'assistantofficer@pointers.internal', 'assistant')
     ) as admin(username, email, role)
     left join auth.users as auth_user
       on lower(auth_user.email) = lower(admin.email)
     where auth_user.id is null;

     if missing_emails is not null then
       raise exception 'Create these users under Authentication → Users first: %', missing_emails;
     end if;

     insert into public.store_admins (user_id, username, role)
     select auth_user.id, admin.username, admin.role
     from (values
       ('secretariat_admin', 'secretariat_admin@pointers.internal', 'secretariat'),
       ('pvpadmin', 'pvpadmin@pointers.internal', 'executive'),
       ('financecommittee', 'financecommittee@pointers.internal', 'finance'),
       ('assistantofficer', 'assistantofficer@pointers.internal', 'assistant')
     ) as admin(username, email, role)
     join auth.users as auth_user
       on lower(auth_user.email) = lower(admin.email)
     on conflict (user_id) do update
       set username = excluded.username,
           role = excluded.role;
   end;
   $$;
   ```

13. Open `/` in the browser and use the **ADMIN** link in the footer. Sign in with either the username above or the corresponding full email address, plus the password set for that Auth user.

If sign-in itself reports **“Database error querying schema”**, the request is failing inside Supabase Auth before `store_admins` is checked. The `store_admins` SQL above cannot fix that Auth service error; check the Supabase Dashboard **Logs → Auth** and **Logs → Postgres** at the time of the failed attempt. Do not change or insert rows directly into `auth.users` to reset a password; use the Supabase Dashboard password-reset flow.

If the database is not configured or the migration has not been run, the storefront uses the spreadsheet-based fallback catalog. It does not display a successful order receipt unless the reservation is actually saved.

## Payment options

Customers can choose GCash or cash over the counter. Selecting GCash displays the supplied QR code and account details (R.H.A · +639641120052). Cash over the counter is paid in person.
GCash pre-orders require a JPG, PNG, WebP, or PDF payment receipt (maximum 5 MB) before they can be confirmed. The receipt is stored in a private bucket and can only be opened by authorized store admins. Cash over the counter orders do not require an upload.
Checkout collects the customer's college and program/affiliation. If **Others** is selected, the customer must enter their program or affiliation.
After a reservation is successfully saved, the student receives an itemized summary with each quantity, unit price, line total, payment method, and saved order total. The summary can be downloaded as a text file or printed/saved as PDF.

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

The bundle component prices above are shown as defined by the workbook; checkout uses each set's listed total, not a recomputed sum. Each bundle card has a separate design selector for every included item (and a T-Shirt size selector); the selected component designs are saved with the order for admin review. Shirt sizes offered are S, M, L, and XL.

## Product image assets

Product artwork already supplied in `src/assets/` is wired into the catalog:

- `Tshirt_1.jpeg`–`Tshirt_4.jpeg`: T-Shirt versions A–D.
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
