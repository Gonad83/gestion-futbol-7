import { ArrowRight, CreditCard } from 'lucide-react';
import type { AjustesEquipoDash } from '../../lib/api/dashboard';

interface Props {
  teamSettings: AjustesEquipoDash;
}

export function BannerPago({ teamSettings }: Props) {
  return (
    <a
      href={teamSettings.payment_link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 hover:brightness-110 hover:translate-y-[-1px]"
      style={{
        background: 'linear-gradient(135deg, rgba(68,243,169,0.12) 0%, rgba(68,243,169,0.06) 100%)',
        border: '1px solid rgba(68,243,169,0.25)',
        boxShadow: '0 4px 24px rgba(68,243,169,0.08)',
      }}
    >
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(68,243,169,0.15)', color: '#44f3a9' }}>
        <CreditCard size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-headline font-black text-white text-base leading-tight">Paga tu cuota mensual</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(68,243,169,0.6)' }}>Haz clic para pagar de forma segura con Mercado Pago</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="hidden sm:block text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl" style={{ background: '#44f3a9', color: '#003822' }}>
          Pagar ahora
        </span>
        <ArrowRight size={16} className="text-soccer-green group-hover:translate-x-1 transition-transform" />
      </div>
    </a>
  );
}
