import { Scale, FileText, CheckCircle } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-12 border-b border-slate-800 pb-8">
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <Scale className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Términos de Servicio</h1>
            <p className="text-slate-400 mt-2 text-lg">Última actualización: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-400" /> 1. Aceptación de los Términos
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Al acceder y utilizar Atlas Logistics ("la Plataforma"), aceptas estar legalmente sujeto a estos Términos de Servicio. 
            Si no estás de acuerdo con alguno de los términos, te prohibimos usar o acceder a la plataforma.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" /> 2. Uso del Servicio
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Atlas Logistics es un software ERP como servicio (SaaS) diseñado para operaciones de Freight Forwarding. 
            Te comprometes a utilizar los servicios exclusivamente para fines comerciales legítimos.
            Queda estrictamente prohibido utilizar la plataforma para envíos de mercancías ilícitas, peligrosas no declaradas o sujetas a embargos internacionales.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">3. Precisión de Tarifas y Rutas</h2>
          <p className="text-slate-400 leading-relaxed">
            Aunque nuestro Rate Comparer y los motores predictivos de IA se esfuerzan por proporcionar datos exactos, las tarifas de flete y los horarios marítimos están sujetos a cambios 
            por parte de los transportistas. Atlas Logistics no se hace responsable de discrepancias finales en facturación que surjan por cambios de los proveedores (GRI, PSS, BAF).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">4. Limitación de Responsabilidad</h2>
          <p className="text-slate-400 leading-relaxed">
            En ningún caso Atlas Logistics ni sus proveedores serán responsables de ningún daño (incluyendo, sin limitación, daños por pérdida de datos o ganancias, 
            o debido a interrupciones del negocio) que surjan del uso o la incapacidad de usar los materiales en la plataforma.
          </p>
        </section>
        
        <div className="pt-8 border-t border-slate-800 mt-12 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Atlas Logistics. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
