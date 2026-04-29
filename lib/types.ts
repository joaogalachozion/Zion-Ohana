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
