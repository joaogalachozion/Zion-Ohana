export interface Igreja {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  pais: string;
  pastor: string;
  tel_pastor: string;
  resp_fin: string;
  tel_fin: string;
  status: string;
  link_contrato: string;
  // Aniversário e entrada
  data_nascimento_pastor?: string;
  data_entrada_ohana?: string;
  // Endereço para presentes
  endereco?: string;
  complemento?: string;
  bairro?: string;
  cidade_endereco?: string;
  estado_endereco?: string;
  cep?: string;
  pais_endereco?: string;
}

export interface Lancamento {
  id?: number;
  mes: string;
  ano: number;
  periodo: string;
  periodo_num: number;
  igreja_id: string;
  dps: number;
  of: number;
  total?: number;
  status: string;
}

export interface KPI {
  label: string;
  value: number;
  type: 'brl' | 'int';
  bg: string;
  fg: string;
}

// ── Gera série completa de períodos ──────────────────────────────────────
export function gerarSeriePeriodos(de: string, ate: string): string[] {
  const series: string[] = [];
  const [mmDe, yyyyDe] = de.split('/').map(Number);
  const [mmAte, yyyyAte] = ate.split('/').map(Number);
  let mes = mmDe, ano = yyyyDe;
  while (ano < yyyyAte || (ano === yyyyAte && mes <= mmAte)) {
    series.push(`${String(mes).padStart(2,'0')}/${ano}`);
    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }
  return series;
}

// ── Calcula fidelidade com estrelas ──────────────────────────────────────
// Regras:
//  - Menos de 2 anos no Ohana → "🆕 Novo" (independente de %)
//  - ≥ 80% com doação         → "⭐⭐⭐ Alta"
//  - 50–79%                   → "⭐⭐ Média"
//  - < 50%                    → "⭐ Baixa"
export function calcularFidelidade(
  dataEntrada: string | undefined,
  _periodos: string[],
  lancamentos: Lancamento[],
  igrejaId: string
): { tag: string; estrelas: number; pct: number; mesesAtivos: number; mesesComDoacao: number; isNovo: boolean } {

  if (!dataEntrada) {
    return { tag: '—', estrelas: 0, pct: 0, mesesAtivos: 0, mesesComDoacao: 0, isNovo: false };
  }

  const entrada = new Date(dataEntrada);
  const hoje = new Date();

  const mesesAtivos = Math.max(1,
    (hoje.getFullYear() - entrada.getFullYear()) * 12 +
    (hoje.getMonth() - entrada.getMonth()) + 1
  );

  const anosAtivos = mesesAtivos / 12;
  const isNovo = anosAtivos < 2;

  const mesesComDoacao = new Set(
    lancamentos
      .filter(l => l.igreja_id === igrejaId && ((l.dps || 0) + (l.of || 0)) > 0)
      .map(l => l.periodo)
  ).size;

  const pct = Math.min(100, Math.round((mesesComDoacao / mesesAtivos) * 100));

  let tag: string;
  let estrelas: number;

  if (isNovo) {
    tag = '🆕 Novo';
    estrelas = 0;
  } else if (pct >= 80) {
    tag = '⭐⭐⭐ Alta';
    estrelas = 3;
  } else if (pct >= 50) {
    tag = '⭐⭐ Média';
    estrelas = 2;
  } else {
    tag = '⭐ Baixa';
    estrelas = 1;
  }

  return { tag, estrelas, pct, mesesAtivos, mesesComDoacao, isNovo };
}

// ── Aniversariantes do mês ────────────────────────────────────────────────
export function aniversariantesDoMes(igrejas: Igreja[], mes?: number): Igreja[] {
  const m = mes ?? new Date().getMonth() + 1;
  return igrejas.filter(ig => {
    if (!ig.data_nascimento_pastor) return false;
    const d = new Date(ig.data_nascimento_pastor);
    return d.getMonth() + 1 === m;
  });
}

// ── Formata endereço completo ─────────────────────────────────────────────
export function formatarEndereco(ig: Igreja): string {
  const partes = [
    ig.endereco,
    ig.complemento,
    ig.bairro,
    ig.cidade_endereco,
    ig.estado_endereco,
    ig.cep,
    ig.pais_endereco,
  ].filter(Boolean);
  return partes.join(', ');
}
