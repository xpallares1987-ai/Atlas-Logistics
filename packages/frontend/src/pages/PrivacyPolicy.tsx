import { Shield, Lock, Eye } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-12 border-b border-slate-800 pb-8">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <Shield className="w-10 h-10 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Política de Privacidad</h1>
            <p className="text-slate-400 mt-2 text-lg">Última actualización: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-6 h-6 text-indigo-400" /> 1. Información que Recopilamos
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Atlas Logistics recopila información para operar eficientemente y proporcionar las mejores experiencias con nuestros servicios logísticos. 
            Recopilamos datos que nos proporcionas directamente, como cuando creas una cuenta o realizas una reserva de envío. 
            También obtenemos información registrando cómo interactúas con nuestros servicios.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Eye className="w-6 h-6 text-indigo-400" /> 2. Uso de la Información
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Usamos los datos para proporcionar y mejorar los servicios que ofrecemos. Esto incluye operar la plataforma, mantener y mejorar el rendimiento 
            del sistema de comparación de tarifas, desarrollar nuevas funcionalidades de inteligencia artificial y proporcionar soporte al cliente.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">3. Compartición de Datos</h2>
          <p className="text-slate-400 leading-relaxed">
            No compartimos tu información personal con terceros sin tu consentimiento, excepto cuando sea necesario para proveer el servicio 
            (por ejemplo, navieras o autoridades aduaneras), cumplir con la ley, o proteger nuestros derechos.
          </p>
        </section>
        
        <div className="pt-8 border-t border-slate-800 mt-12 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Atlas Logistics. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
