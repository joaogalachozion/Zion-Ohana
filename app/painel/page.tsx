'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPerfil } from '@/lib/supabase-auth';
import type { Igreja, Pastor } from '@/lib/types';
import { User, Building2, Phone, Mail, Cake, FileText } from 'lucide-react';

const TEAL = '#002624', MINT = '#C5FFCE';

export default function MeuPerfil() {
  const [igreja, setIgreja] = useState<Igreja | null>(null);
  const [pastor, setPastor] = useState<Pastor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const perfil = await getPerfil();
      if (!perfil?.igreja_id) { setLoading(false); return; }
      const [{ data: ig }, { data: pa }] = await Promise.all([
        supabase.from('igrejas').select('*').eq('id', perfil.igreja_id).maybeSingle(),
        supabase.from('pastores').select('*').eq('igreja_id', perfil.igreja_id).maybeSingle(),
      ]);
      setIgreja(ig); setPastor(pa); setLoading(false);
    })();
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center font-medium" style={{ color: TEAL }}>Carregando...</div>;
  if (!igreja) return <div className="bg-white rounded-xl p-8 text-center text-gray-400">Perfil ainda não vinculado a uma igreja.</div>;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: TEAL }}>Meu Perfil</h1>
        <p className="text-sm text-gray-500">{igreja.nome} · {igreja.id}</p>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: TEAL }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: MINT }}>
              <User size={22} style={{ color: TEAL }} />
            </div>
            <div>
              <div className="font-bold" style={{ color: MINT }}>{pastor?.nome || igreja.pastor}</div>
              <div className="text-xs opacity-60" style={{ color: MINT }}>Pastor Sênior</div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: MINT, color: TEAL }}>
            {igreja.status}
          </span>
        </div>
        <div className="bg-white px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info icon={Building2} label="Igreja" value={igreja.nome} />
          <Info icon={Building2} label="Sede" value={[igreja.cidade, igreja.estado].filter(Boolean).join(', ') || '—'} />
          <Info icon={Phone} label="Telefone" value={pastor?.telefone || igreja.tel_pastor || '—'} />
          <Info icon={Phone} label="Tel. secretária" value={pastor?.telefone_secretaria || '—'} />
          <Info icon={Mail} label="E-mail corporativo" value={pastor?.email_corporativo || '—'} />
          <Info icon={Cake} label="Nascimento" value={pastor?.data_nascimento ? new Date(pastor.data_nascimento).toLocaleDateString('pt-BR') : '—'} />
        </div>
      </div>

      {igreja.link_contrato && (
        <a href={igreja.link_contrato} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          style={{ color: TEAL }}>
          <FileText size={15} /> Ver contrato enviado
        </a>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon size={16} className="text-gray-300 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-medium" style={{ color: TEAL }}>{value}</div>
      </div>
    </div>
  );
}
