'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, Home, QrCode } from 'lucide-react';

const TEAL = '#002624', MINT = '#C5FFCE', LARANJA = '#FE5000';
const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PixInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const valor = parseFloat(sp.get('valor') || '0');
  const tipo = sp.get('tipo') === 'DPS' ? 'Dízimo do Pastor Sênior' : 'Ohana Fee';
  const [restante, setRestante] = useState(15 * 60); // 15 minutos

  useEffect(() => {
    if (restante <= 0) { router.replace('/painel'); return; }
    const t = setInterval(() => setRestante(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [restante, router]);

  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: TEAL }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="text-2xl font-bold" style={{ color: MINT }}>ZION</div>
          <div className="text-xs opacity-60" style={{ color: MINT }}>Ohana — Rede de Igrejas</div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold mb-1" style={{ color: TEAL }}>
            <QrCode size={16} /> Pague com PIX
          </div>
          <p className="text-xs text-gray-500 mb-4">{tipo}{valor > 0 ? ` · ${brl(valor)}` : ''}</p>

          <div className="rounded-xl p-3 inline-block border border-gray-100">
            {/* QR estático (simulação). Substitua public/pix-doacao.png pelo seu QR real. */}
            <img src="/pix-doacao.png" alt="QR Code PIX" width={220} height={220}
              style={{ display: 'block', width: 220, height: 220 }} />
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Abra o app do seu banco, escaneie o QR Code e confirme o pagamento.
          </p>

          {/* Timer */}
          <div className="mt-5 flex items-center justify-center gap-2 py-2.5 rounded-xl"
            style={{ background: '#FFF3E9' }}>
            <Clock size={16} style={{ color: LARANJA }} />
            <span className="text-sm font-semibold" style={{ color: LARANJA }}>
              Expira em {mm}:{ss}
            </span>
          </div>

          <button onClick={() => router.replace('/painel')}
            className="mt-5 w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white"
            style={{ background: TEAL }}>
            <Home size={16} /> Voltar ao início
          </button>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#6f938b' }}>
          Sua doação já foi registrada e está aguardando confirmação.
        </p>
      </div>
    </div>
  );
}

export default function PixPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: TEAL }} />}>
      <PixInner />
    </Suspense>
  );
}
