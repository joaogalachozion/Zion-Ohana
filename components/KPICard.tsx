interface Props {
  label: string;
  value: number;
  type?: 'brl' | 'int';
  bg: string;
  fg: string;
  accent?: string;
  sub?: string;
}

export function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function KPICard({ label, value, type = 'brl', bg, fg, accent, sub }: Props) {
  const display = type === 'brl' ? formatBRL(value) : value.toString();
  return (
    <div className="rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ background: bg }}>
      <div className="px-5 pt-4 pb-1">
        <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: fg, opacity: 0.7 }}>
          {label}
        </div>
        <div className="text-2xl font-bold leading-tight" style={{ color: fg }}>
          {display}
        </div>
        {sub && <div className="text-xs mt-1" style={{ color: fg, opacity: 0.6 }}>{sub}</div>}
      </div>
      <div className="h-1 mt-3" style={{ background: accent || fg, opacity: 0.3 }} />
    </div>
  );
}
