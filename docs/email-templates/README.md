# Email Templates — BTOP Rentals

Visual previews (mockups) of the transactional emails the system sends. Open any
`.html` file in a browser to preview it. These are reference designs — the live
demo renders the confirmation email from the editable template in **Reservations →
Email Settings**, and the rental agreement from **Contracts → Template**.

When the Supabase/API backend is connected, these HTML files are the source of
truth to hand to the email provider (e.g. Resend / SendGrid / Postmark). The
`{{placeholders}}` are replaced server-side with each order's real data.

| File | Email | Trigger |
|------|-------|---------|
| `01-payment-confirmation.html` | Payment confirmed | Admin approves a payment (Zelle/Cash/Invoice) or Stripe auto-approves |
| `02-rental-agreement.html` | Rental agreement (PDF attached) | Same approval event — sent together with the confirmation |
| `03-payment-received-review.html` | Payment under review | Client submits a Zelle report / places a cash order |
| `04-payment-rejected.html` | Payment rejected | Admin rejects a reported payment |

## Placeholders

`{{client_name}}` · `{{client_email}}` · `{{client_phone}}` · `{{order_number}}` ·
`{{invoice}}` · `{{contract_number}}` · `{{item}}` · `{{items}}` · `{{startDate}}` ·
`{{endDate}}` · `{{days}}` · `{{total}}` · `{{deposit}}` · `{{remaining}}` ·
`{{payment_method}}` · `{{approved_date}}`

> All copy is in English (project standard).
