import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export function periodoNum(periodo: string): number {
  const [mm, yyyy] = periodo.split('/');
  return parseInt(yyyy) * 100 + parseInt(mm);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function periodoLabel(periodo: string): string {
  const [mm, yyyy] = periodo.split('/');
  return `${MESES[parseInt(mm)-1]}/${yyyy}`;
}
