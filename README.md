# Span Fitness Quotation Management System

Professional quotation website for **SPAN FITNESS EQUIPMENTS** built with Next.js, TypeScript, Tailwind CSS, custom admin-cookie authentication, PostgreSQL on Supabase, Supabase Storage, and server-side PDF generation.

The seed catalog intentionally contains only 12 demo products. Real products can be added later through the product form or CSV/Excel import.

## Features

- Custom admin login with a signed HTTP-only session cookie.
- Dashboard with product and quotation metrics.
- Product CRUD with soft delete, image upload, search, filters, CSV export, and CSV/XLSX import preview with column mapping.
- Brand, category, and sub-category management.
- Customer CRUD.
- Team member management with role, branch, status, and secure custom-login credentials.
- Image-to-link converter with crop, rotate, 1600×1600 white-board output, download, R2 upload, and local history.
- Quotation builder with product picker, existing/new customer flow, editable item snapshots, GST modes, live totals, draft edit, revision, permanent delete, and status updates.
- A4 quotation preview and Playwright HTML-to-PDF generation.
- Generated PDF upload to Supabase Storage with signed PDF links.
- WhatsApp share message with quotation number, grand total, and PDF link.
- Future-ready email API placeholder.
- Company, bank, GST, and terms settings.

## Stack

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS
- Custom admin auth, PostgreSQL, Supabase Storage, RLS
- Playwright PDF generation
- read-excel-file for XLSX import

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=admin@spanfitness.com
AUTH_SECRET=replace-with-a-long-random-secret
```

4. Apply Supabase migrations in order:

```bash
supabase db push
```

Or run the SQL files manually in Supabase SQL Editor:

- `supabase/migrations/001_schema.sql`
- `supabase/migrations/002_seed.sql`
- `supabase/migrations/003_replace_welcare_branding.sql`
- `supabase/migrations/004_add_customer_suffix.sql`
- `supabase/migrations/005_update_ui_theme_color.sql`
- `supabase/migrations/006_add_team_members.sql`
- `supabase/migrations/007_add_member_profile_photos.sql`
- `supabase/migrations/008_add_account_profile_fields.sql`
- `supabase/migrations/009_shorten_quotation_numbers.sql`
- `supabase/migrations/010_add_member_discount_limit.sql`
- `supabase/migrations/011_secure_admin_auth_and_login_throttling.sql`
- `supabase/migrations/012_fix_login_throttle_function.sql`
- `supabase/migrations/013_cleanup_stale_login_attempts.sql`
- `supabase/migrations/014_transactional_quotations_and_excel_storage.sql`

5. Set your admin login.

The app does not use Supabase Auth. Main administrator and team-member passwords are
stored only as salted PBKDF2-SHA256 hashes in Supabase. The main administrator hash is
stored in `profiles.password_hash`; team-member hashes are stored in
`team_members.password_hash`. Login attempts are throttled persistently in PostgreSQL.
Sessions use signed HTTP-only cookies.

6. Install Playwright Chromium for PDF generation:

```bash
npx playwright install chromium
```

Vercel uses the bundled `@sparticuz/chromium` serverless browser instead of the local
Playwright browser.

7. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Supabase Storage Buckets

The migration creates these buckets:

- `product-images` public, for product photos.
- `company-assets` public, for logo, signature, and brand footer logos.
- `quotation-pdfs` private, for generated quotation PDFs.
- `member-photos` public, for team member profile photos.

Generated PDFs are uploaded to `quotation-pdfs` and shared through signed URLs.

## Database Tables

The migrations create:

- `profiles`
- `products`
- `brands`
- `categories`
- `customers`
- `team_members`
- `quotations`
- `quotation_number_counters`
- `quotation_items`
- `company_settings`
- `brand_footer_logos`
- `pdf_files`
- `activity_logs`

Quotation items store product snapshots, so old quotations remain stable after product prices or product details change.

## Product Import Columns

Supported columns can be mapped during import:

- SKU
- Product Name
- Brand
- Description
- Unit Price
- Image URL or Image Filename

The import validates missing required fields and duplicate SKUs before saving.

## PDF Notes

The PDF branding uses **SPAN FITNESS EQUIPMENTS** as the company identity. Welcare, Maxpro, Firm, Reebok, and other names are used only as product or associated brand labels, not as company ownership.

Default company details are editable in Settings:

- Firm Name: SPAN FITNESS EQUIPMENTS
- Bank Name: HDFC Bank
- Account No: 50200062043280
- Branch: Vishakhapatnam
- IFSC Code: HDFC0006274
- GST NO: 37EHKPK9679G1ZH
- Phone: 9703344483 | 9840639509
- Email: spanfitnessequipments@gmail.com

## Verification Commands

```bash
npm run typecheck
npm run build
npm audit --omit=dev
```

With the local development server running, execute the authenticated browser suite:

```bash
npm run test:e2e
```

The E2E suite uses the configured Supabase project. It creates uniquely named temporary
members, products, customers, quotations, PDFs, and Excel files, then removes them.

## Testing Checklist

- Add product.
- Edit product.
- Soft delete product.
- Import CSV/XLSX product file.
- Export products to CSV.
- Upload product image.
- Create customer.
- Create quotation.
- Select products and edit quantity/quote price.
- Verify GST calculation in all modes.
- Save draft and edit draft.
- Generate PDF.
- Download PDF.
- Share PDF link on WhatsApp.
- Delete quotation.
- Create revision.
- Cancel quotation.
- Change product price and confirm old quotation items remain unchanged.
