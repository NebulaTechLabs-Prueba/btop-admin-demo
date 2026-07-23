import { supabase } from './supabase.js';

/**
 * Envía un correo branded vía la Edge Function `send-email` (Resend).
 * Best-effort y no bloqueante: si Supabase/Resend no está listo, no rompe la UI.
 * type: reservation-confirmed | payment-validated | payment-rejected | rental-agreement | invoice
 */
export async function sendEmail(type, to, data = {}, attachment = null) {
  if (!supabase || !to) return { ok: false };
  try {
    const body = { type, to, data };
    if (attachment && attachment.content) body.attachment = attachment;
    const { data: res, error } = await supabase.functions.invoke('send-email', { body });
    if (error) { console.warn('[sendEmail]', error.message); return { ok: false }; }
    return res || { ok: true };
  } catch (e) {
    console.warn('[sendEmail]', e?.message);
    return { ok: false };
  }
}
