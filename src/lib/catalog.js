import { supabase } from './supabase.js';

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
