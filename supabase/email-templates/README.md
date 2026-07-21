# BTOP Rentals — Email templates (branded)

Branded HTML emails. Colors: navy `#0A1628`/`#1E3A5F`, blue `#1B4DDB`, muted `#6B7280`.
Wordmark **BTOP RENTALS** (text-based so it renders without external images).
All styles are **inlined** (required by email clients). Footer carries the company
contact block (kept in sync with the `company` setting in Supabase).

## Two groups

### 1) Supabase Auth (paste into Dashboard → Authentication → Email Templates)
Use Supabase's `{{ .Variable }}` placeholders.
- `confirm-signup.html`  → "Confirm signup"
- `magic-link.html`      → "Magic Link"
- `reset-password.html`  → "Reset Password"
- `invite.html`          → "Invite user"

Supabase vars available: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`,
`{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`.

Also set **Authentication → URL Configuration → Site URL** = `https://btop-rentals.com`
and add it to the allowed Redirect URLs.

### 2) Transactional (sent from Edge Functions via **Resend**)
Use `{{ double_brace }}` placeholders that the Edge Function replaces before sending.
- `reservation-confirmed.html` — `{{client_name}} {{order_number}} {{item}} {{start}} {{end}} {{total}}`
- `payment-validated.html`     — `{{client_name}} {{order_number}} {{amount}} {{method}}`
- `payment-rejected.html`      — `{{client_name}} {{order_number}} {{resubmit_url}}`
- `rental-agreement.html`      — `{{client_name}} {{contract_number}} {{download_url}}` (attach the signed PDF)
- `invoice.html`               — `{{client_name}} {{invoice_number}} {{amount_due}} {{due_date}} {{pay_url}}`

Resend setup: verify the sending domain (`btop-rentals.com`) in Resend, set `RESEND_API_KEY`
as a Supabase secret, and send with `from: "BTOP Rentals <no-reply@btop-rentals.com>"`.

The company block (address/phone/email) mirrors the `settings.company` row; when you change
it there, update the footer here too (or have the Edge Function inject it).
