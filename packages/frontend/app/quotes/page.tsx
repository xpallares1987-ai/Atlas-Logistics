'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  DollarSign, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  FileText, 
  Layers, 
  RefreshCw, 
  Info, 
  FileCheck,
  Percent,
  CheckCircle2,
  Box,
  Scale
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import AddressSelector from '@/components/common/AddressSelector';
import { getAddresses } from '@/lib/addressStore';
import { fetchQuotes, createQuote } from '@/app/actions/actions';

interface CostLine {
  id: string;
  description: string;
  provider: string;
  unitType: string;
  quantity: number;
  cost: number; // Buy
  sell: number; // Sell
}

interface QuoteDraft {
  id: string;
  client: string;
  ref: string;
  validity: string;
  status: string;
  lines: CostLine[];
  volumeCbm: number;
  weightKg: number;
}

const PRESET_TEMPLATES = {
  FCL_OCEAN: [
    { description: 'Ocean Freight FCL 40HC (CNSHA to ESBCN)', provider: 'COSCO Shipping', unitType: '40HC Container', quantity: 1, cost: 2100, sell: 2600 },
    { description: 'Terminal Handling Charges (THC) - Origen', provider: 'Shanghai Port Terminal', unitType: 'Fijo', quantity: 1, cost: 180, sell: 220 },
    { description: 'Export Customs Clearance / Despacho DUA', provider: 'Customs Partners', unitType: 'Servicio', quantity: 1, cost: 95, sell: 130 },
    { description: 'THC Destino & Delivery Port Fees', provider: 'APM Terminals Barcelona', unitType: 'Fijo', quantity: 1, cost: 230, sell: 290 },
    { description: 'Inland Drayage (Port to Consignee)', provider: 'Trans-Catalunya S.L.', unitType: 'Trayecto', quantity: 1, cost: 320, sell: 390 }
  ],
  AIR_EXPRESS: [
    { description: 'Air Freight Cargo Premium (HKG to MAD)', provider: 'Cargolux Airlines', unitType: 'Por kg CHW', quantity: 350, cost: 3.8, sell: 4.5 },
    { description: 'Fuel Surcharge (FSC)', provider: 'Cargolux Airlines', unitType: 'Por kg CHW', quantity: 350, cost: 0.85, sell: 1.1 },
    { description: 'Security Surcharge (SSC)', provider: 'Cargolux Airlines', unitType: 'Por kg CHW', quantity: 350, cost: 0.15, sell: 0.25 },
    { description: 'Airport Handling & GHA Fees', provider: 'Worldwide Flight Services', unitType: 'Envío', quantity: 1, cost: 120, sell: 160 },
    { description: 'Despacho de Importación Express', provider: 'Barajas Broker S.A.', unitType: 'DUA', quantity: 1, cost: 85, sell: 125 }
  ],
  LCL_CONSOLIDATED: [
    { description: 'Ocean Freight LCL Consolidation (SGSIN to USLAX)', provider: 'Vanguard Logistics', unitType: 'Por CBM/Ton', quantity: 8.5, cost: 75, sell: 95 },
    { description: 'LCL Warehousing / CFS Fee Origen', provider: 'SGP Warehouse', unitType: 'Por CBM', quantity: 8.5, cost: 25, sell: 35 },
    { description: 'CFS De-consolidation & Destination Handling', provider: 'LAX CFS Services', unitType: 'Por CBM', quantity: 8.5, cost: 45, sell: 60 },
    { description: 'Despacho Aduanal', provider: 'National Brokerage', unitType: 'Servicio', quantity: 1, cost: 110, sell: 150 }
  ]
};

export default function QuotesPage() {
  const [lines, setLines] = useState<CostLine[]>([
    { id: '1', description: 'Ocean Freight FCL 40HC', provider: 'Maersk Line', unitType: '40HC Container', quantity: 1, cost: 1850, sell: 2200 },
    { id: '2', description: 'THC Barcelona', provider: 'APM Terminals', unitType: 'Fijo', quantity: 1, cost: 210, sell: 260 },
    { id: '3', description: 'Documentación & BL', provider: 'Maersk Line', unitType: 'Documento', quantity: 1, cost: 50, sell: 75 },
    { id: '4', description: 'Despacho de Aduanas Import', provider: 'Customs Forward Partners', unitType: 'DUA', quantity: 1, cost: 120, sell: 175 },
  ]);

  const [clientInfo, setClientInfo] = useState({ 
    client: 'Industrial Catalana S.A.', 
    ref: 'QTE-2026-FOS-102', 
    validity: '2026-07-15', 
    status: 'DRAFT' 
  });

  // Technical Volumetric Calculator controls
  const [calcMode, setCalcMode] = useState<'AIR' | 'LCL'>('AIR');
  const [calcPkgs, setCalcPkgs] = useState<number>(5);
  const [calcLength, setCalcLength] = useState<number>(120); // cm
  const [calcWidth, setCalcWidth] = useState<number>(80);  // cm
  const [calcHeight, setCalcHeight] = useState<number>(160); // cm
  const [calcWeight, setCalcWeight] = useState<number>(850);  // kg

  const [calcVolumeCbm, setCalcVolumeCbm] = useState<number>(0);
  const [calcChargeableWeight, setCalcChargeableWeight] = useState<number>(0);

  // Saved local drafts list
  const [savedQuotes, setSavedQuotes] = useState<QuoteDraft[]>([]);

  // Load quotes from backend
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const quotes = await fetchQuotes();
        // map backend quotes to drafts for UI compatibility
        const mappedQuotes: QuoteDraft[] = quotes.map((q: any) => ({
          id: String(q.id),
          client: 'Customer ID ' + q.customer_id,
          ref: 'QTE-DB-' + q.id,
          validity: q.valid_until,
          status: q.status,
          lines: [],
          volumeCbm: 0,
          weightKg: 0
        }));
        setSavedQuotes(mappedQuotes);
      } catch (e) {
        console.error('Error loading backend quotes:', e);
      }
    };
    loadQuotes();
  }, []);

  // Recalculate volumetric figures whenever inputs change
  useEffect(() => {
    // Volume (m3) = (Length x Width x Height) / 1,000,000 * Packages
    const rawVol = (calcLength * calcWidth * calcHeight * calcPkgs) / 1000000;
    setCalcVolumeCbm(parseFloat(rawVol.toFixed(3)));

    let chw = 0;
    if (calcMode === 'AIR') {
      // Standard IATA weight ratio 1:6000 (1 CBM = 167 kg)
      const volWeight = (calcLength * calcWidth * calcHeight * calcPkgs) / 6000;
      chw = Math.max(calcWeight, volWeight);
    } else {
      // Ocean LCL consolidation standard 1:1000 (1 CBM = 1000 kg)
      const volWeight = rawVol * 1000;
      chw = Math.max(calcWeight, volWeight);
    }
    setCalcChargeableWeight(Math.round(chw));
  }, [calcMode, calcPkgs, calcLength, calcWidth, calcHeight, calcWeight]);

  const addLine = () => {
    setLines([...lines, { 
      id: Date.now().toString(), 
      description: '', 
      provider: '', 
      unitType: 'Fijo', 
      quantity: 1, 
      cost: 0, 
      sell: 0 
    }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof CostLine, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const loadPreset = (presetKey: 'FCL_OCEAN' | 'AIR_EXPRESS' | 'LCL_CONSOLIDATED') => {
    const selectedPreset = PRESET_TEMPLATES[presetKey];
    const newLines = selectedPreset.map((line, idx) => ({
      ...line,
      id: `${Date.now()}-${idx}`
    }));
    
    // For Air cargo premium preset, pre-populate standard chargeable weight
    if (presetKey === 'AIR_EXPRESS' && calcChargeableWeight > 0) {
      newLines.forEach(line => {
        if (line.unitType === 'Por kg CHW') {
          line.quantity = calcChargeableWeight;
        }
      });
    }

    // For LCL consolidated preset, pre-populate volume CBM
    if (presetKey === 'LCL_CONSOLIDATED' && calcVolumeCbm > 0) {
      newLines.forEach(line => {
        if (line.unitType === 'Por CBM/Ton') {
          line.quantity = calcVolumeCbm;
        }
      });
    }

    setLines(newLines);
  };

  // Finance calculations matching SCM margin controls
  const totalCost = lines.reduce((acc, curr) => acc + ((Number(curr.cost) || 0) * (Number(curr.quantity) || 1)), 0);
  const totalSell = lines.reduce((acc, curr) => acc + ((Number(curr.sell) || 0) * (Number(curr.quantity) || 1)), 0);
  const profit = totalSell - totalCost;
  const margin = totalSell > 0 ? (profit / totalSell) * 100 : 0;
  
  const isExpired = clientInfo.validity ? new Date(clientInfo.validity) < new Date() : false;

  const handleApplyCalcToQuote = () => {
    // If we've calculated a volumetric weight, append or replace matching quantities
    const updated = lines.map(line => {
      if (calcMode === 'AIR' && line.unitType === 'Por kg CHW') {
        return { ...line, quantity: calcChargeableWeight };
      }
      if (calcMode === 'LCL' && line.unitType === 'Por CBM/Ton') {
        return { ...line, quantity: calcVolumeCbm };
      }
      return line;
    });
    setLines(updated);
  };

  const handleSaveQuote = async () => {
    if (!clientInfo.client.trim()) {
      alert('Por favor, ingresa el nombre del cliente para registrar la cotización.');
      return;
    }

    try {
      // Use defaults for MVP since the UI uses free-text lines instead of db rates
      const quotePayload = {
        customer_id: 1, // Defaulting for MVP
        origin_port: 'CNSHA',
        destination_port: 'ESBCN',
        valid_until: clientInfo.validity || new Date().toISOString().split('T')[0],
        options: [
          {
            freight_rate_id: 1, // Defaulting for MVP
            total_price: Number(totalSell),
            margin_percentage: margin ? Number(margin) : null
          }
        ]
      };
      
      const savedQuote = await createQuote(quotePayload);
      
      const newDraft: QuoteDraft = {
        id: String(savedQuote.id),
        client: clientInfo.client,
        ref: clientInfo.ref || `QTE-DB-${savedQuote.id}`,
        validity: savedQuote.valid_until,
        status: savedQuote.status,
        lines,
        volumeCbm: calcVolumeCbm,
        weightKg: calcWeight
      };

      const updatedQuotes = [newDraft, ...savedQuotes.filter(q => q.ref !== newDraft.ref)];
      setSavedQuotes(updatedQuotes);
      alert(`Cotización con referencia "${newDraft.ref}" guardada correctamente en base de datos.`);
    } catch (e) {
      console.error(e);
      alert('Error guardando la cotización en base de datos');
    }
  };

  const handleLoadDraft = (quote: QuoteDraft) => {
    setLines(quote.lines);
    setClientInfo({
      client: quote.client,
      ref: quote.ref,
      validity: quote.validity,
      status: quote.status
    });
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedQuotes.filter(q => q.id !== id);
    setSavedQuotes(updated);
    // Deletion is visual-only for now until the backend delete route is added
  };

  // Perfect PDF generation for pricing sheets matching official SCM parameters
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const emerald = [16, 185, 129];
      const slate = [15, 23, 42];
      const textGray = [71, 85, 105];

      // Draw Header Banner
      doc.setFillColor(slate[0], slate[1], slate[2]);
      doc.rect(0, 0, 210, 42, 'F');

      // Decorative Graphic Accent
      doc.setFillColor(emerald[0], emerald[1], emerald[2]);
      doc.rect(0, 40, 210, 2, 'F');

      // Logo Left
      doc.ellipse(25, 21, 9, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('$', 23.5, 24);

      // Title
      doc.setFontSize(20);
      doc.text('ForwarderOS - Cotización SCM', 40, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 200, 215);
      doc.text('Estructuración Técnica de Fletes Internacionales y Rentabilidad (P&L)', 40, 26);
      doc.text(`Ref Internacional: ${clientInfo.ref}`, 40, 31);

      // Top Right Meta Block
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.text(`Expedido: ${new Date().toISOString().split('T')[0]}`, 145, 18);
      doc.text(`Validez: ${clientInfo.validity || 'Sin definir'}`, 145, 23);
      doc.text(`Estatus: ${clientInfo.status}`, 145, 28);
      doc.text(`FOS Audit ID: FOS-${Math.floor(10000 + Math.random() * 90000)}`, 145, 33);

      // Client Info Summary Block
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('INFORMACIÓN DE VALIDEZ Y CUENTA DE CLIENTE', 15, 54);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(15, 56, 195, 56);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('Cliente de Cuenta:', 15, 63);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 25, 30);
      doc.text(clientInfo.client, 50, 63);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('Grupaje/Volumen:', 15, 68);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 25, 30);
      doc.text(`${calcVolumeCbm.toFixed(2)} CBM`, 50, 68);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('Peso Declarado:', 15, 73);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 25, 30);
      doc.text(`${calcWeight} kg (CHW: ${calcChargeableWeight} kg)`, 50, 73);

      // Financial totals panel (Top right summary in paper)
      doc.setFillColor(248, 250, 252);
      doc.rect(130, 59, 65, 18, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(130, 59, 65, 18, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.text('TOTAL COTIZADO (VENTA)', 134, 64);
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`$${totalSell.toLocaleString()}`, 134, 73);

      // Cost Lines Breakdown Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.text('DESGLOSE DETALLADO DE CONCEPTOS Y LINEAS DE COSTO', 15, 87);
      doc.line(15, 89, 195, 89);

      // Table Header row
      doc.setFillColor(slate[0], slate[1], slate[2]);
      doc.rect(15, 93, 180, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('SERVICIOS / CONCEPTO', 18, 98.5);
      doc.text('PROVEEDOR', 68, 98.5);
      doc.text('UD', 105, 98.5);
      doc.text('CANT', 123, 98.5);
      doc.text('BUY/COST ($)', 140, 98.5);
      doc.text('SELL ($)', 163, 98.5);
      doc.text('TOTAL SELL ($)', 179, 98.5);

      let y = 101;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      lines.forEach((line, index) => {
        // Zebra strapping
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 8, 'F');
        }

        doc.setTextColor(15, 23, 42);
        // Shorten long descriptions to avoid overlapping
        const shortDesc = line.description.length > 30 ? `${line.description.substring(0, 28)}..` : line.description;
        doc.text(shortDesc || 'Concepto adicional', 18, y + 5);
        doc.text(line.provider || 'S/Proveedor', 68, y + 5);
        doc.text(line.unitType || 'Fijo', 105, y + 5);
        doc.text(line.quantity.toString(), 125, y + 5);
        
        doc.setFont('font-mono', 'normal');
        doc.text(line.cost.toFixed(2), 140, y + 5);
        doc.text(line.sell.toFixed(2), 163, y + 5);
        
        doc.setFont('helvetica', 'bold');
        doc.text((line.sell * line.quantity).toFixed(2), 179, y + 5);
        
        doc.setFont('helvetica', 'normal');
        y += 8;
      });

      // Insert blank spacing row for totals
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 10, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(15, y, 195, y);
      doc.line(15, y + 10, 195, y + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SUMATORIAS TOTALES', 18, y + 6);
      doc.setFont('font-mono', 'bold');
      doc.text(`Buy: $${totalCost.toLocaleString()}`, 115, y + 6);
      doc.text(`Sell: $${totalSell.toLocaleString()}`, 154, y + 6);

      // SCM Profit and Leak Audit
      y += 18;
      doc.setFillColor(254, 254, 254);
      doc.rect(15, y, 180, 24, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, y, 180, 24, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.text('AUDITORÍA DE MARGEN OPERATIVO DE AGENCIA (P&L)', 19, y + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(`Rendimiento Neto de Flete: $${profit.toLocaleString()}`, 19, y + 13);
      doc.text(`Porcentaje de Margen Comercial de Agencia: ${margin.toFixed(2)}%`, 19, y + 18);

      // Dynamic warning logic for risky low-margins (< 15%)
      if (margin < 15) {
        doc.setTextColor(220, 38, 38); // red
        doc.setFont('helvetica', 'bold');
        doc.text('ALERTA: Margen de rentabilidad inferior al 15% recomendado para Freight Forwarding.', 87, y + 18);
      } else {
        doc.setTextColor(16, 185, 129); // green
        doc.setFont('helvetica', 'bold');
        doc.text('SANO: Margen comercial superior al pilar estricto de viabilidad de agencia.', 87, y + 18);
      }

      // Regulatory Footer
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Aprobación Comercial SCM', 145, y + 54);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.line(140, y + 50, 185, y + 50);
      doc.text('Sello y Firma Electrónica', 146, y + 58);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Exención de responsabilidad: Las tarifas cotizadas están sujetas a fluctuaciones de Bunker Surcharges (BAF/CAF).', 15, 285);
      doc.text('Página 1 de 1', 175, 285);

      // Start download
      doc.save(`ForwarderOS_Quote_${clientInfo.ref}_${clientInfo.client.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Inconveniente al generar PDF corporativo de cotización:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-gray-200">
      
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900/50 via-slate-900/20 to-transparent p-6 border border-gray-800 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Estructurador Tarifario de Fletes (P&L)</h1>
          </div>
          <p className="text-xs text-gray-400 max-w-3xl">
            Herramienta avanzada de rentabilidad de Freight Forwarding. Estructura costos de compra (Buy) y venta (Sell) en base a pesos volumetricos técnicos de carga.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            id="save-quote-db-button"
            onClick={handleSaveQuote}
            className="bg-[#121214] border border-gray-800 hover:bg-gray-800 active:scale-95 text-gray-200 px-4 py-2 rounded-lg text-xs font-bold font-sans transition flex items-center cursor-pointer"
          >
            <Save className="w-4 h-4 mr-2 text-gray-400" /> Registrar en Historial
          </button>
          <button 
            id="export-pdf-quote-button"
            onClick={handleExportPDF}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-lg text-xs font-bold font-sans transition flex items-center cursor-pointer shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar a Cotización PDF
          </button>
        </div>
      </div>

      {/* Preset template loaders matching real SCM flows */}
      <div className="bg-[#111114] border border-gray-800/60 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1" /> Cargador de Plantillas SCM
          </span>
          <p className="text-[11px] text-gray-400">Inserta de forma express tarifas de rutas preseleccionadas y desgloses de costos completos.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={() => loadPreset('FCL_OCEAN')}
            className="flex-1 sm:flex-initial bg-[#16161A] hover:bg-gray-800 border border-gray-850 px-3 py-1.5 rounded text-xs transition cursor-pointer text-gray-300"
          >
            🚢 Ocean FCL (Maersk/Cosco)
          </button>
          <button 
            onClick={() => loadPreset('AIR_EXPRESS')}
            className="flex-1 sm:flex-initial bg-[#16161A] hover:bg-gray-800 border border-gray-850 px-3 py-1.5 rounded text-xs transition cursor-pointer text-gray-300"
          >
            ✈️ Premium Air Express
          </button>
          <button 
            onClick={() => loadPreset('LCL_CONSOLIDATED')}
            className="flex-1 sm:flex-initial bg-[#16161A] hover:bg-gray-800 border border-gray-850 px-3 py-1.5 rounded text-xs transition cursor-pointer text-gray-300"
          >
            📦 LCL Consolidado Directo
          </button>
        </div>
      </div>

      {/* Two columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Cost Breakdown Table Worksheet (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Parameters */}
          <div className="bg-[#111114] border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <Info className="w-4 h-4 mr-1.5 text-blue-500" /> Parámetros de Ruta & DUA de Importación
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-400 tracking-wider mb-1">Cliente / Cuenta</label>
                <AddressSelector
                  value={clientInfo.client}
                  onChange={val => setClientInfo({ ...clientInfo, client: val })}
                  allowedTypes={['Cliente']}
                  placeholder="Seleccionar cliente..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-400 tracking-wider mb-1">Referencia Cotización</label>
                <input 
                  type="text" 
                  value={clientInfo.ref}
                  onChange={e => setClientInfo({ ...clientInfo, ref: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-400 tracking-wider mb-1">Status Interno</label>
                <select 
                  value={clientInfo.status}
                  onChange={e => setClientInfo({ ...clientInfo, status: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="SENT border">Enviado al Cliente</option>
                  <option value="ACCEPTED">Aceptado / Validado</option>
                  <option value="REJECTED">Rechazado</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-400 tracking-wider mb-1">Fecha Validez</label>
                <input 
                  type="date" 
                  value={clientInfo.validity}
                  onChange={e => setClientInfo({ ...clientInfo, validity: e.target.value })}
                  className={`w-full bg-[#0A0A0B] border ${isExpired ? 'border-red-500 text-red-400' : 'border-gray-800 text-white'} rounded px-2.5 py-1.5 text-xs focus:outline-none`}
                />
              </div>
            </div>
            {isExpired && (
              <p className="text-[11px] text-red-500 font-bold flex items-center">
                ⚠ Este presupuesto ha sobrepasado su fecha de validez límite. Se sugiere recalcular BAF.
              </p>
            )}
          </div>

          {/* Core spreadsheet */}
          <div className="bg-[#111114] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-800 bg-[#16161A] flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-blue-500" /> Conceptos Cotizados ({lines.length})
              </span>
              <button 
                onClick={addLine}
                className="bg-[#0A0A0B] hover:bg-gray-800 text-blue-400 border border-gray-800 hover:text-blue-300 px-3 py-1 rounded text-xs font-bold transition flex items-center cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Concepto Extra
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0A0A0B] text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                    <th className="p-3">DESCRIPCIÓN</th>
                    <th className="p-3">PROVEEDOR</th>
                    <th className="p-3">UNI. MEDICIÓN</th>
                    <th className="p-3 text-right w-16">CANT</th>
                    <th className="p-3 text-right w-24">COP. COMPRA (BUY)</th>
                    <th className="p-3 text-right w-24">VENTA (SELL)</th>
                    <th className="p-3 text-right w-24">SUBTOTAL VENTA</th>
                    <th className="p-3 text-center w-12">ACC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-950/20 transition-colors">
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={line.description}
                          onChange={e => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Flete Marítimo..."
                          className="w-full bg-transparent border-none outline-none focus:ring-0 text-white text-xs p-0 placeholder-gray-700"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={line.provider}
                          onChange={e => updateLine(line.id, 'provider', e.target.value)}
                          className="w-full bg-[#0A0A0B]/80 text-gray-300 text-xs p-1 rounded border border-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="">Seleccionar proveedor...</option>
                          {getAddresses().map(addr => (
                            <option key={addr.id} value={addr.name}>{addr.name} ({addr.type})</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select 
                          value={line.unitType}
                          onChange={e => updateLine(line.id, 'unitType', e.target.value)}
                          className="bg-[#0A0A0B] border border-gray-800 rounded p-1 text-[11px] text-gray-300 focus:outline-none"
                        >
                          <option value="40HC Container">40HC Cont.</option>
                          <option value="20GP Container">20GP Cont.</option>
                          <option value="Por CBM/Ton">Por CBM/Ton</option>
                          <option value="Por kg CHW">Por kg CHW</option>
                          <option value="Fijo">Corte Fijo</option>
                          <option value="Servicio">Servicio</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          value={line.quantity}
                          onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-[#0A0A0B] border border-gray-800 rounded px-1.5 py-1 text-right text-xs text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          value={line.cost}
                          onChange={e => updateLine(line.id, 'cost', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#0A0A0B] border border-gray-800 rounded px-1.5 py-1 text-right text-xs text-red-400 font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          value={line.sell}
                          onChange={e => updateLine(line.id, 'sell', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#0A0A0B] border border-gray-800 rounded px-1.5 py-1 text-right text-xs text-green-400 font-mono"
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-white font-bold">
                        ${((line.sell || 0) * (line.quantity || 1)).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => removeLine(line.id)}
                          className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                        No hay conceptos cargados. Usa el cargador de plantillas superior o añade uno de forma libre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: SCM Technical Volumetric Calculator & P&L Insights */}
        <div className="space-y-6">
          
          {/* P&L Financial Summary Insights card */}
          <div className="bg-[#111114] border border-gray-800 p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center">
              <Percent className="w-4 h-4 mr-1.5 text-blue-500" /> Margen y Análisis P&L
            </h3>
            
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="bg-[#0A0A0B] p-3 rounded border border-gray-900">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Compra (Cost)</span>
                <span className="text-lg font-mono text-white font-bold">
                  ${totalCost.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#0A0A0B] p-3 rounded border border-gray-900">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Venta (Sell)</span>
                <span className="text-lg font-mono text-emerald-400 font-bold">
                  ${totalSell.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-400 block">BENEFICIO BRUTO COMERCIAL</span>
                <span className="text-xl font-extrabold text-white">${profit.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block">MARGEN OPERATIVO</span>
                <span className={`text-lg font-extrabold ${margin >= 15 ? 'text-emerald-400' : 'text-amber-500'}`}>
                  {margin.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#16161A] border border-gray-800 rounded-lg text-[11px] text-gray-400 text-slate-400 leading-relaxed">
              {margin < 15 ? (
                <span className="text-amber-400 font-bold flex items-center">
                  ⚠ El margen comercial es bajo ({margin.toFixed(1)}%). Recomendado renegociar con proveedor o incrementar tasa de venta (Sell).
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center">
                  ✔ Margen comercial optimizado ({margin.toFixed(1)}%). Estructura viable para operaciones de tránsito.
                </span>
              )}
            </div>
          </div>

          {/* Technical IATA Volumetric & Chargeable Weight Converter */}
          <div className="bg-[#111114] border border-gray-800 p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center">
              <Box className="w-4 h-4 mr-1.5 text-blue-500" /> Convertidor Peso Cobrable (CHW)
            </h3>
            
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Calcula metros cúbicos y peso cobrable. El flete se cobrará sobre el valor más alto entre peso bruto y volumétrico.
            </p>

            <div className="flex bg-[#0A0A0B] p-1 rounded-lg border border-gray-850">
              <button 
                onClick={() => setCalcMode('AIR')}
                className={`flex-1 text-center py-1 rounded text-xs font-bold transition ${calcMode === 'AIR' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10' : 'text-gray-500'}`}
              >
                ✈ IATA AIR (1:6000)
              </button>
              <button 
                onClick={() => setCalcMode('LCL')}
                className={`flex-1 text-center py-1 rounded text-xs font-bold transition ${calcMode === 'LCL' ? 'bg-emerald-600/15 text-emerald-450 border border-emerald-500/10' : 'text-gray-500'}`}
              >
                🚢 LCL OCEAN (1:1000)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-[10.5px] text-gray-400 mb-1">Pallets / Bultos</label>
                <input 
                  type="number" 
                  value={calcPkgs} 
                  onChange={e => setCalcPkgs(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] text-gray-400 mb-1">Peso Bruto (kg total)</label>
                <input 
                  type="number" 
                  value={calcWeight} 
                  onChange={e => setCalcWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9.5px] text-gray-400 mb-1">Largo (cm)</label>
                <input 
                  type="number" 
                  value={calcLength} 
                  onChange={e => setCalcLength(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-1.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[9.5px] text-gray-400 mb-1">Ancho (cm)</label>
                <input 
                  type="number" 
                  value={calcWidth} 
                  onChange={e => setCalcWidth(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-1.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[9.5px] text-gray-400 mb-1">Alto (cm)</label>
                <input 
                  type="number" 
                  value={calcHeight} 
                  onChange={e => setCalcHeight(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-1.5 py-1 text-xs text-white"
                />
              </div>
            </div>

            <div className="bg-[#0A0A0B] p-4 rounded-xl border border-gray-850 space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Volumen Consolidado:</span>
                <span className="font-mono text-white font-bold">{calcVolumeCbm.toFixed(3)} CBM</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>P. Volumétrico Teórico:</span>
                <span className="font-mono text-white">
                  {calcMode === 'AIR' ? Math.round((calcLength * calcWidth * calcHeight * calcPkgs) / 6000) : Math.round(calcVolumeCbm * 1000)} kg
                </span>
              </div>
              <div className="h-px bg-gray-800/60 my-1"></div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-400 uppercase tracking-wider font-bold">Peso Cobrable (CHW):</span>
                <span className="font-mono text-white text-sm font-extrabold">{calcChargeableWeight} KG</span>
              </div>
            </div>

            <button
              onClick={handleApplyCalcToQuote}
              className="w-full bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded py-2 text-xs font-bold font-sans transition cursor-pointer text-center"
            >
              Aplicar a las Líneas de Cotización
            </button>
          </div>

          {/* Quick Drafts Vault */}
          <div className="bg-[#111114] border border-gray-800 p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center">
              <FileCheck className="w-4 h-4 mr-1.5 text-blue-500" /> Registro de Cotizaciones Guardadas ({savedQuotes.length})
            </h3>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {savedQuotes.map((q) => (
                <div 
                  key={q.id}
                  onClick={() => handleLoadDraft(q)}
                  className="p-2.5 bg-[#0A0A0B] hover:bg-gray-800 border border-gray-850 rounded-lg flex justify-between items-center cursor-pointer transition"
                >
                  <div className="truncate flex-1 pr-2">
                    <span className="text-xs font-bold text-white block truncate">{q.client}</span>
                    <span className="text-[10px] text-blue-400 block font-mono font-medium">{q.ref}</span>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-emerald-450">${q.lines.reduce((a,c)=>a+(c.sell*c.quantity),0).toLocaleString()}</span>
                    <button 
                      onClick={(e) => handleDeleteDraft(q.id, e)}
                      className="p-1 text-gray-500 hover:text-red-400 rounded transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {savedQuotes.length === 0 && (
                <p className="text-[11px] text-gray-500 italic text-center py-4">No hay cotizaciones guardadas en LocalStorage.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
