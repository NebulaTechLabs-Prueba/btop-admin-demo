import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';

/* Best-effort background sync of an array to a Supabase table using a jsonb `data`
   column (lossless round-trip). Never blocks/throws into the UI. */
function syncRows(table, pk, keyCols, prev, next) {
  if (!supabase) return;
  try {
    const prevById = new Map(prev.map((r) => [r[pk], r]));
    const changed = next.filter((r) => {
      const p = prevById.get(r[pk]);
      return !p || JSON.stringify(p) !== JSON.stringify(r);
    });
    if (changed.length) {
      supabase
        .from(table)
        .upsert(changed.map((r) => ({ [pk]: r[pk], ...keyCols(r), data: r })), { onConflict: pk })
        .then(({ error }) => { if (error) console.warn(`[sync ${table}]`, error.message); });
    }
    const nextIds = new Set(next.map((r) => r[pk]));
    const removed = prev.filter((r) => !nextIds.has(r[pk]));
    if (removed.length) {
      supabase
        .from(table)
        .delete()
        .in(pk, removed.map((r) => r[pk]))
        .then(({ error }) => { if (error) console.warn(`[sync ${table} del]`, error.message); });
    }
  } catch (e) { console.warn(`[sync ${table}]`, e?.message); }
}

/**
 * Supabase-backed array state that preserves the [value, setValue] API.
 * - No Supabase → uses `seed` (dev / offline), no sync.
 * - Supabase → starts empty, hydrates from the table (RLS-gated) whenever `authKey`
 *   changes (login/logout), and write-throughs every mutation best-effort.
 * `keyCols(row)` returns the extra columns to persist for RLS/queries.
 */
export function useCollection(table, { pk = 'id', seed = [], keyCols = () => ({}), authKey } = {}) {
  const [items, setItems] = useState(isSupabaseConfigured ? [] : seed);
  const ready = useRef(!isSupabaseConfigured);
  const keyColsRef = useRef(keyCols);
  keyColsRef.current = keyCols;

  useEffect(() => {
    if (!supabase) return;
    let off = false;
    (async () => {
      try {
        const { data, error } = await supabase.from(table).select('data');
        if (!off && !error && Array.isArray(data)) setItems(data.map((r) => r.data).filter(Boolean));
      } catch {}
      ready.current = true;
    })();
    return () => { off = true; };
  }, [authKey, table]);

  const set = useCallback((updater) => {
    setItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (supabase && ready.current) syncRows(table, pk, keyColsRef.current, prev, next);
      return next;
    });
  }, [table, pk]);

  return [items, set];
}

/**
 * Supabase-backed map keyed by email → the app's `{email: value}` per-user stores
 * (signatures, saved payments, client docs, deposit prefs). One jsonb row per email.
 */
export function useEmailMap(table, authKey) {
  const [map, setMap] = useState({});
  const ready = useRef(!isSupabaseConfigured);
  useEffect(() => {
    if (!supabase) return;
    let off = false;
    supabase.from(table).select('email,data').then(({ data, error }) => {
      if (!off && !error && Array.isArray(data)) {
        const m = {};
        data.forEach((r) => { if (r.email) m[r.email] = r.data; });
        setMap(m);
      }
      ready.current = true;
    });
    return () => { off = true; };
  }, [authKey, table]);
  const set = useCallback((updater) => {
    setMap((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (supabase && ready.current) {
        Object.keys(next).forEach((email) => {
          if (JSON.stringify(prev[email]) !== JSON.stringify(next[email])) {
            supabase.from(table).upsert({ email, data: next[email] }, { onConflict: 'email' })
              .then(({ error }) => { if (error) console.warn(`[emailmap ${table}]`, error.message); });
          }
        });
      }
      return next;
    });
  }, [table]);
  return [map, set];
}

/**
 * Supabase-backed singleton (one row in `settings` keyed by `key`, jsonb value).
 * Keeps the default when Supabase has no row (fail-safe), write-throughs on change.
 */
export function useSetting(key, def) {
  const [value, setValue] = useState(def);
  useEffect(() => {
    if (!supabase) return;
    let off = false;
    supabase.from('settings').select('value').eq('key', key).maybeSingle()
      .then(({ data, error }) => { if (!off && !error && data && data.value != null) setValue(data.value); });
    return () => { off = true; };
  }, [key]);
  const set = useCallback((updater) => {
    setValue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (supabase) supabase.from('settings').upsert({ key, value: next }, { onConflict: 'key' })
        .then(({ error }) => { if (error) console.warn(`[setting ${key}]`, error.message); });
      return next;
    });
  }, [key]);
  return [value, set];
}
