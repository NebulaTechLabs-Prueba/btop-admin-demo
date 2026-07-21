import { supabase } from './supabase.js';

// Carga los perfiles (staff/usuarios) desde Supabase. Público-legible (nombres).
export async function loadProfiles() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('email,name,role');
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

// Carga la flota desde Supabase (lectura pública). Devuelve las filas crudas
// (snake_case) o null si no hay Supabase / error / vacío → el caller mantiene el seed.
export async function loadFleetUnits() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('fleet_units')
      .select('*')
      .eq('active', true);
    if (error || !data || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

// Carga los espacios de almacenamiento + sus rentas activas desde Supabase.
// Devuelve el arreglo ya con la forma que usa la app, o null (→ el caller mantiene el seed).
export async function loadSpaces() {
  if (!supabase) return null;
  try {
    const [sres, rres] = await Promise.all([
      supabase.from('storage_spaces').select('*').eq('active', true),
      supabase.from('space_rentals').select('*'),
    ]);
    const sp = sres.data;
    if (sres.error || !sp || sp.length === 0) return null;
    const rentals = rres.data || [];
    const n = (v, d) => (v == null ? (d ?? 0) : Number(v));
    return sp.map((s) => ({
      id: s.id, name: s.name, type: s.type, size: s.size, customSize: s.custom_size,
      maxWeight: s.max_weight, surface: s.surface, location: s.location, access: s.access, branch: s.branch,
      daily: n(s.daily), weekly: n(s.weekly), monthly: n(s.monthly), deposit: n(s.deposit),
      status: s.status || 'available', tenant: '', since: '',
      inventoryEnabled: !!s.inventory_enabled, totalStock: n(s.total_stock), active: s.active !== false,
      internalNotes: s.notes || '', docs: [],
      activeRentals: rentals
        .filter((r) => r.space_id === s.id)
        .map((r) => ({
          oid: r.oid, invNum: r.inv_num, tenant: r.tenant, tenantEmail: r.tenant_email,
          tenantPhone: r.tenant_phone, leaseStart: r.lease_start, leaseEnd: r.lease_end,
        })),
    }));
  } catch {
    return null;
  }
}
