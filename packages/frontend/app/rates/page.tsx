'use client';
import { CurrencyFxConfigHub } from './components/rates/CurrencyFxConfigHub';
import { RatesVisualSummary } from './components/rates/RatesVisualSummary';
import { RatesKPI } from './components/rates/RatesKPI';
import { AddContractRateForm } from './components/rates/AddContractRateForm';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Anchor, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Plus, 
  Ship, 
  Plane, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Trash2,
  RefreshCw,
  Coins,
  Globe,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Sliders,
  Percent,
  AlertTriangle,
  Check
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic<any>(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic<any>(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const AreaChart = dynamic<any>(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Line = dynamic<any>(() => import('recharts').then((mod: any) => mod.Line), { ssr: false });
const Area = dynamic<any>(() => import('recharts').then((mod: any) => mod.Area), { ssr: false });
const XAxis = dynamic<any>(() => import('recharts').then((mod: any) => mod.XAxis), { ssr: false });
const YAxis = dynamic<any>(() => import('recharts').then((mod: any) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic<any>(() => import('recharts').then((mod: any) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic<any>(() => import('recharts').then((mod: any) => mod.Tooltip), { ssr: false });
const Legend = dynamic<any>(() => import('recharts').then((mod: any) => mod.Legend), { ssr: false });
const RadarChartDynamic = dynamic<any>(() => import('recharts').then((mod: any) => mod.RadarChart), { ssr: false });
const RadarDynamic = dynamic<any>(() => import('recharts').then((mod: any) => mod.Radar), { ssr: false });
const PolarGridDynamic = dynamic<any>(() => import('recharts').then((mod: any) => mod.PolarGrid), { ssr: false });
const PolarAngleAxisDynamic = dynamic<any>(() => import('recharts').then((mod: any) => mod.PolarAngleAxis), { ssr: false });
const PolarRadiusAxisDynamic = dynamic<any>(() => import('recharts').then((mod: any) => mod.PolarRadiusAxis), { ssr: false });


import { CurrencyType, ContractRate } from './types';
import { DEFAULT_RATES, LINE_COLORS } from './constants';
import { formatCurrencySymbol, getExpiryStatus } from './utils';
import { CustomChartTooltip } from './components/CustomChartTooltip';

export default function RatesPage() {
  const [rates, setRates] = useState<ContractRate[]>([]);
  const [searchPol, setSearchPol] = useState('');
  const [searchPod, setSearchPod] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  
  // Display view currency selector
  const [displayCurrency, setDisplayCurrency] = useState<'ORIGINAL' | CurrencyType>('ORIGINAL');
  
  // Default base currency setting state
  const [defaultCurrency, setDefaultCurrency] = useState<'ORIGINAL' | CurrencyType>('ORIGINAL');

  // State for selected stable carrier in the side-by-side fuel comparison
  const [selectedStableCarrierId, setSelectedStableCarrierId] = useState<string | null>(null);
  const [cmpOilPricePercentage, setCmpOilPricePercentage] = useState<number>(20); // Default to +20% as per user request

  // Dual-route comparison states
  const [selectedCarrierForRouteCmp, setSelectedCarrierForRouteCmp] = useState<string>('');
  const [selectedRouteA, setSelectedRouteA] = useState<string>('');
  const [selectedRouteB, setSelectedRouteB] = useState<string>('');

  const handleCarrierChange = (carrier: string) => {
    setSelectedCarrierForRouteCmp(carrier);
    const carrierRates = rates.filter(r => r.carrier === carrier);
    const routes = Array.from(new Set(carrierRates.map(r => `${r.pol} → ${r.pod}`)));
    if (routes.length >= 2) {
      setSelectedRouteA(routes[0]);
      setSelectedRouteB(routes[1]);
    } else if (routes.length >= 1) {
      setSelectedRouteA(routes[0]);
      setSelectedRouteB(routes[0]);
    } else {
      setSelectedRouteA('');
      setSelectedRouteB('');
    }
  };

  // Relative oil change simulation percentage (ranges from -50% to +150%)
  const [oilChangePercentage, setOilChangePercentage] = useState<number>(0);

  // Custom Exchange rates state (Reference base: 1 USD)
  const [exchangeRates, setExchangeRates] = useState<Record<CurrencyType, number>>({
    USD: 1.0,
    EUR: 1.08,  // 1 EUR = 1.08 USD
    GBP: 1.25,  // 1 GBP = 1.25 USD
    CNY: 0.14,  // 1 CNY = 0.14 USD
  });

  // Custom rate creator state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRate, setNewRate] = useState<Omit<ContractRate, 'id'>>({
    carrier: '',
    mode: 'FCL',
    pol: '',
    pod: '',
    equipment: '40HC',
    baseRate: 0,
    bafSurcharge: 0,
    currency: 'USD',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '2026-12-31',
    transitTimeDays: 14,
    allocationsTeu: 100
  });

  useEffect(() => {
    // 1. Fetch live market rates via secure server action (simulated real-world integration)
    const initMarketData = async () => {
      try {
        const { fetchLiveMarketData } = await import('@/app/actions/ratesActions');
        const data = await fetchLiveMarketData();
        // Here you could update local exchange rates based on secure remote data
        // For demonstration, we simply log the secure fetch
        console.log('Secure server action rate sync completed.', data.lastUpdated);
      } catch (err) {
        console.error('Failed to sync market data', err);
      }
    };
    initMarketData();

    // 2. Load Local Storage state
    const saved = localStorage.getItem('forwarderos_contract_rates');  }, []);

  // Pre-fill default values for the dual-route comparison widget
  useEffect(() => {
    if (rates && rates.length > 0) {
      const uniqueCarriers = Array.from(new Set(rates.map(r => r.carrier)));
      
      // Look for a carrier that has at least two routes
      let bestCarrier = uniqueCarriers[0] || '';
      for (const carrier of uniqueCarriers) {
        const routes = Array.from(new Set(rates.filter(r => r.carrier === carrier).map(r => `${r.pol} → ${r.pod}`)));
        if (routes.length >= 2) {
          bestCarrier = carrier;
          break;
        }
      }

      if (bestCarrier) {
        setSelectedCarrierForRouteCmp(prev => prev || bestCarrier);
        
        const activeCarrier = selectedCarrierForRouteCmp || bestCarrier;
        const carrierRates = rates.filter(r => r.carrier === activeCarrier);
        const routes = Array.from(new Set(carrierRates.map(r => `${r.pol} → ${r.pod}`)));
        if (routes.length >= 2) {
          setSelectedRouteA(prev => prev || routes[0]);
          setSelectedRouteB(prev => prev || routes[1]);
        } else if (routes.length >= 1) {
          setSelectedRouteA(prev => prev || routes[0]);
          setSelectedRouteB(prev => prev || routes[0]);
        }
      }
    }
  }, [rates, selectedCarrierForRouteCmp]);

  const handleExchangeRateChange = (curr: CurrencyType, val: number) => {
    const updatedRates = { ...exchangeRates, [curr]: val };
    setExchangeRates(updatedRates);
    localStorage.setItem('forwarderos_exchange_rates', JSON.stringify(updatedRates));
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { addContractRate } = await import('@/app/actions/ratesActions');
      const rateToSave = {
        ...newRate,
        pol: newRate.pol.toUpperCase().trim(),
        pod: newRate.pod.toUpperCase().trim()
      };
      
      const validatedRate = await addContractRate(rateToSave);
      
      const updated = [validatedRate, ...rates];
      setRates(updated);
      localStorage.setItem('forwarderos_contract_rates', JSON.stringify(updated));
      setShowAddForm(false);
      
      // Reset form
      setNewRate({
        carrier: '',
        mode: 'FCL',
        pol: '',
        pod: '',
        equipment: '40HC',
        baseRate: 0,
        bafSurcharge: 0,
        currency: 'USD',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: '2026-12-31',
        transitTimeDays: 14,
        allocationsTeu: 100
      });
      alert('Nueva tarifa de convenio validada y registrada exitosamente.');
    } catch (error: any) {
      alert('Error de validación: ' + error.message);
    }
  };

  const handleDeleteRate = (id: string) => {
    if (confirm('¿Está seguro de querer remover esta tarifa de convenio de la base de datos?')) {
      const updated = rates.filter(r => r.id !== id);
      setRates(updated);
      localStorage.setItem('forwarderos_contract_rates', JSON.stringify(updated));
    }
  };

  // Conversion logic Helper
  // All exchanges are defined relative to 1 USD.
  // EUR = 1.08 USD (so 1 EUR * 1.08 = 1.08 USD)
  // CNY = 0.14 USD (so 100 CNY * 0.14 = 14 USD)
  const convertAmount = React.useCallback((amount: number, fromCurrency: CurrencyType, targetCurrency: CurrencyType): number => {
    if (fromCurrency === targetCurrency) return amount;
    const valueInUSD = amount / exchangeRates[fromCurrency];
    return valueInUSD * exchangeRates[targetCurrency];
  }, [exchangeRates]);

  // Render values based on selected display currency
  const renderRateValue = (val: number, originalCurrency: CurrencyType) => {
    if (displayCurrency === 'ORIGINAL') {
      return `${formatCurrencySymbol(originalCurrency)}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${originalCurrency}`;
    }
    
    const converted = convertAmount(val, originalCurrency, displayCurrency);
    return `${formatCurrencySymbol(displayCurrency)}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${displayCurrency}`;
  };

  // Custom states for historical comparison
  const [isClient, setIsClient] = useState(false);
  const [selectedHistoryRoute, setSelectedHistoryRoute] = useState<string>('');
  const [historicalViewMode, setHistoricalViewMode] = useState<'BASE_RATES' | 'BAF_OIL_CORRELATION'>('BASE_RATES');
  const [correlationDisplayMode, setCorrelationDisplayMode] = useState<'ABSOLUTE' | 'NORMALIZED'>('ABSOLUTE');
  const [showBrentOverlay, setShowBrentOverlay] = useState<boolean>(true);
  const [chartDisplayType, setChartDisplayType] = useState<'BASE_ONLY' | 'BAF_ONLY' | 'COMPARATIVE'>('BASE_ONLY');
  const [bafSensitivity, setBafSensitivity] = useState<number>(100);
  const [bafSimulatedVolume, setBafSimulatedVolume] = useState<number>(120);
  const [isolatedHistoricalCarrier, setIsolatedHistoricalCarrier] = useState<string>('ALL');
  const [bafManualAdjustment, setBafManualAdjustment] = useState<number>(100);
  const [fxLogs, setFxLogs] = useState<{timestamp: string, action: string}[]>([]);
  const [fxNotification, setFxNotification] = useState<string | null>(null);

  const addFxLog = (action: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setFxLogs(prev => [{ timestamp: timeStr, action }, ...prev].slice(0, 10));
  };

  const toastNotice = (msg: string) => {
    setFxNotification(msg);
    setTimeout(() => {
      setFxNotification(prev => prev === msg ? null : prev);
    }, 4000);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (rates.length > 0 && !selectedHistoryRoute) {
      const liveRoutes = Array.from(new Set(rates.map(r => `${r.pol} → ${r.pod}`)));
      if (liveRoutes.length > 0) {
        setSelectedHistoryRoute(liveRoutes[0]);
      }
    }
  }, [rates, selectedHistoryRoute]);

  
  const bafProjectedImpact = React.useMemo(() => {
    if (!selectedHistoryRoute) return { targetCurr: 'USD' as CurrencyType, standardBafCost: 0, customBafCost: 0, delta: 0, showSavings: false };
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    
    const oilChangePercentage = 11; // Example 11% increase
    let standardBafCost = 0;
    let customBafCost = 0;
    
    matchingRates.forEach(rate => {
      const bafBase = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
      const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
      
      const originalBafCostPerUnit = bafBase * (1 + (oilChangePercentage / 100) * baseElasticity);
      const customBafCostPerUnit = bafBase * (1 + (oilChangePercentage / 100) * baseElasticity * (bafSensitivity / 100));
      
      standardBafCost += originalBafCostPerUnit * bafSimulatedVolume;
      customBafCost += customBafCostPerUnit * bafSimulatedVolume;
    });

    return {
       targetCurr: targetCurr as CurrencyType,
       standardBafCost,
       customBafCost,
       delta: Math.abs(standardBafCost - customBafCost),
       showSavings: bafSensitivity < 100 && oilChangePercentage > 0
    };
  }, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity, bafSimulatedVolume]);

  const historicalBAFOilCorrelationData = React.useMemo(() => {
    if (!selectedHistoryRoute) return [];
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const monthsList = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];

    return monthsList.map((month, idx) => {
      const brentPrice = oilPrices[idx];
      const dataPoint: any = { month, 'Crudo Brent (USD/bbl)': brentPrice };
      matchingRates.forEach(rate => {
        const normalizedBaf = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
        const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
        const elasticity = baseElasticity * (bafSensitivity / 100);
        const currentBaf = normalizedBaf * (1 + ((brentPrice / 85.0) - 1) * elasticity);
        dataPoint[rate.carrier + ' (BAF)'] = Math.round(currentBaf);
      });
      return dataPoint;
    });
  }, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity]);

  const historicalBAFNormalizedCorrelationData = React.useMemo(() => {
    if (!selectedHistoryRoute) return [];
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const monthsList = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];
    const oilBase = oilPrices[0];

    return monthsList.map((month, idx) => {
      const brentPrice = oilPrices[idx];
      const brentNormalized = (brentPrice / oilBase) * 100;
      
      const dataPoint: any = { month, 'Crudo Brent (Índice Base 100)': parseFloat(brentNormalized.toFixed(1)) };
      
      matchingRates.forEach(rate => {
        const normalizedBaf = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
        const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
        const elasticity = baseElasticity * (bafSensitivity / 100);
        
        const baseBaf = normalizedBaf * (1 + ((oilPrices[0] / 85.0) - 1) * elasticity);
        const currentBaf = normalizedBaf * (1 + ((brentPrice / 85.0) - 1) * elasticity);
        
        const bafNormalized = baseBaf > 0 ? (currentBaf / baseBaf) * 100 : 100;
        dataPoint[rate.carrier + ' (Índice BAF)'] = parseFloat(bafNormalized.toFixed(1));
      });
      return dataPoint;
    });
  }, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity]);

  const historicalDataForRoute = React.useMemo(() => {
    if (!selectedHistoryRoute) return [];
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const monthsList = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    
    return monthsList.map((month, idx) => {
      const dataPoint: any = { month };
      matchingRates.forEach(rate => {
        const normalizedRate = convertAmount(rate.baseRate, rate.currency, targetCurr);
        const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seedVariance = ((carrierSeed % 12) - 6) / 200;
        
        let multiplier = 1.0;
        if (idx === 0) multiplier = 0.88 + seedVariance;      
        else if (idx === 1) multiplier = 0.92 + seedVariance * 0.4;  
        else if (idx === 2) multiplier = 1.02 - seedVariance * 0.3;  
        else if (idx === 3) multiplier = 1.07 + seedVariance * 0.7;  
        else if (idx === 4) multiplier = 0.97 - seedVariance;       
        else multiplier = 1.0;                                     
        
        dataPoint[rate.carrier] = Math.round(normalizedRate * multiplier);
      });
      return dataPoint;
    });
  }, [selectedHistoryRoute, rates, convertAmount, displayCurrency]);

  const historicalBaseVsBafData = React.useMemo(() => {
    if (!selectedHistoryRoute) return [];
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const monthsList = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];

    return monthsList.map((month, idx) => {
      const brentPrice = oilPrices[idx];
      const dataPoint: any = { month };
      matchingRates.forEach(rate => {
        const normalizedRate = convertAmount(rate.baseRate, rate.currency, targetCurr);
        const normalizedBaf = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
        
        const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seedVariance = ((carrierSeed % 12) - 6) / 200;
        
        let baseMultiplier = 1.0;
        if (idx === 0) baseMultiplier = 0.88 + seedVariance;
        else if (idx === 1) baseMultiplier = 0.92 + seedVariance * 0.4;
        else if (idx === 2) baseMultiplier = 1.02 - seedVariance * 0.3;
        else if (idx === 3) baseMultiplier = 1.07 + seedVariance * 0.7;
        else if (idx === 4) baseMultiplier = 0.97 - seedVariance;
        else baseMultiplier = 1.0;
        const currentBase = Math.round(normalizedRate * baseMultiplier);

        const oilRatio = brentPrice / 85.0;
        const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
        const elasticity = baseElasticity * (bafSensitivity / 100);
        const currentBaf = Math.round(normalizedBaf * (1 + (oilRatio - 1) * elasticity));

        dataPoint[rate.carrier + ' (Base)'] = currentBase;
        dataPoint[rate.carrier + ' (BAF)'] = currentBaf;
      });
      return dataPoint;
    });
  }, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity]);

  const activeCarriersForSelectedRoute = React.useMemo(() => {
    if (!selectedHistoryRoute) return [];
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    return Array.from(new Set(matchingRates.map(r => r.carrier))).sort();
  }, [selectedHistoryRoute, rates]);

const historicalBafSurchargesOnlyData = React.useMemo(() => {
    if (!selectedHistoryRoute) return [];
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const monthsList = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];

    return monthsList.map((month, idx) => {
      const brentPrice = oilPrices[idx];
      const dataPoint: any = { month };
      matchingRates.forEach(rate => {
        const normalizedBaf = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
        const oilRatio = brentPrice / 85.0;
        const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
        const elasticity = baseElasticity * (bafSensitivity / 100);
        const monthlyBaf = Math.round(normalizedBaf * (1 + (oilRatio - 1) * elasticity));
        dataPoint[rate.carrier] = monthlyBaf;
      });
      return dataPoint;
    });
  }, [rates, displayCurrency, convertAmount, selectedHistoryRoute, bafSensitivity]);

  const volatilityBreakdown = React.useMemo(() => {
    if (!selectedHistoryRoute) return [];
    const carriers = activeCarriersForSelectedRoute;
    const baseData = historicalDataForRoute;
    // historicalBafSurchargesOnlyData already memoized earlier
    
  

    const bafData = historicalBafSurchargesOnlyData;

    return carriers.map(carrier => {
      const baseValues = baseData.map(d => d[carrier]).filter(v => v !== undefined);
      const bafValues = bafData.map(d => d[carrier]).filter(v => v !== undefined);

      const minBase = baseValues.length > 0 ? Math.min(...baseValues) : 0;
      const maxBase = baseValues.length > 0 ? Math.max(...baseValues) : 0;
      const baseSwing = minBase > 0 ? ((maxBase - minBase) / minBase) * 100 : 0;

      const minBaf = bafValues.length > 0 ? Math.min(...bafValues) : 0;
      const maxBaf = bafValues.length > 0 ? Math.max(...bafValues) : 0;
      const bafSwing = minBaf > 0 ? ((maxBaf - minBaf) / minBaf) * 100 : 0;

      return {
        carrier,
        baseSwing,
        bafSwing,
        volatilityDiscrepancy: Math.abs(bafSwing - baseSwing)
      };
    });
  }, [selectedHistoryRoute, activeCarriersForSelectedRoute, historicalDataForRoute, historicalBafSurchargesOnlyData]);

  

  const getMonthlyBafsForRoute = React.useCallback((route: string) => {
    const [polVal, podVal] = route.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];
    
    const bafValues: number[] = [];
    oilPrices.forEach(brentPrice => {
      matchingRates.forEach(rate => {
        const normalizedBaf = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
        const oilRatio = brentPrice / 85.0;
        const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
        const elasticity = baseElasticity * (bafSensitivity / 100);
        const monthlyBaf = normalizedBaf * (1 + (oilRatio - 1) * elasticity);
        bafValues.push(monthlyBaf);
      });
    });
    return bafValues;
  }, [rates, displayCurrency, convertAmount, bafSensitivity]);


  const getRouteBafMetrics = React.useCallback(() => {
    const allRoutes = Array.from(new Set(rates.map(r => `${r.pol} → ${r.pod}`)));
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];

    return allRoutes.map(route => {
      const [polVal, podVal] = route.split(' → ');
      const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
      const bafValues = getMonthlyBafsForRoute(route);

      if (bafValues.length === 0) {
        return {
          route,
          avgBaf: 0,
          stdDev: 0,
          deviationPercentage: 0,
          annualCost: 0,
          carriersCount: 0
        };
      }
      
      const avgBaf = bafValues.reduce((a, b) => a + b, 0) / bafValues.length;
      const variance = bafValues.reduce((a, b) => a + Math.pow(b - avgBaf, 2), 0) / bafValues.length;
      const stdDev = Math.sqrt(variance);
      const deviationPercentage = avgBaf > 0 ? (stdDev / avgBaf) * 100 : 0;
      const carriersCount = matchingRates.length;
      
      const annualCost = avgBaf * bafSimulatedVolume * 12;
      
      return {
        route,
        avgBaf,
        stdDev,
        deviationPercentage,
        annualCost,
        carriersCount
      };
    });
  }, [rates, displayCurrency, bafSimulatedVolume, getMonthlyBafsForRoute]);


  const top3CarriersBafVolatility = React.useMemo(() => {
    if (!selectedHistoryRoute) return { data: [], carriers: [] };
    const [polVal, podVal] = selectedHistoryRoute.split(' → ');
    const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];

    const carriersRates = matchingRates.reduce((acc, rate) => {
      if (!acc[rate.carrier]) acc[rate.carrier] = [];
      acc[rate.carrier].push(rate);
      return acc;
    }, {} as Record<string, typeof rates>);

    const top3Carriers = Object.keys(carriersRates).sort().slice(0, 3);
    const top3CarriersRates = top3Carriers.flatMap(c => carriersRates[c]);
    const monthsList = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

    const chartData = monthsList.map((month, idx) => {
      const brentPrice = oilPrices[idx];
      const dataPoint: any = { month };
      
      top3CarriersRates.forEach(rate => {
        const normalizedBaf = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
        const oilRatio = brentPrice / 85.0;
        const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
        const elasticity = baseElasticity * (bafSensitivity / 100);
        const monthlyBaf = Math.round(normalizedBaf * (1 + (oilRatio - 1) * elasticity));
        dataPoint[rate.carrier] = monthlyBaf;
      });

      return dataPoint;
    });

    return {
      data: chartData,
      carriers: top3Carriers
    };
  }, [selectedHistoryRoute, rates, displayCurrency, convertAmount, bafSensitivity]);

  const filteredRates = rates.filter(rate => {
    const matchesPol = !searchPol || rate.pol.toLowerCase().includes(searchPol.toLowerCase());
    const matchesPod = !searchPod || rate.pod.toLowerCase().includes(searchPod.toLowerCase());
    const matchesMode = filterMode === 'ALL' || rate.mode === filterMode;
    return matchesPol && matchesPod && matchesMode;
  });

  return (
    <div id="rates-module-root" className="p-8 max-w-7xl mx-auto space-y-8 text-gray-200">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-950/20 via-slate-900/10 to-transparent p-6 border border-gray-800 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Anchor className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Tarifario de Convenio Internacional (Multi-Divisa)</h1>
          </div>
          <p className="text-xs text-gray-400 max-w-3xl">
            Gestione de manera centralizada las tarifas negociadas con navieras y aerolíneas de flete internacional, con soporte nativo para cotización en múltiples monedas (USD, EUR, GBP, CNY) y conversión de tipos de cambio en tiempo real.
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-lg text-xs font-bold font-sans transition flex items-center cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Registrar Nueva Tarifa
        </button>
      </div>

      {/* Visual Summary Section / Resumen Visual del Tarifario */}
      {isClient && (
        <RatesVisualSummary rates={rates} defaultCurrency={defaultCurrency} convertAmount={convertAmount} getRouteBafMetrics={getRouteBafMetrics} />
      )}
      {isClient && (
        <RatesKPI rates={rates} />
      )}
      
      {/* Radar Chart Section */}
      {isClient && (
        <div className="bg-[#0A0A0C] border border-gray-800 rounded-xl p-6">
           <h3 className="text-sm font-bold text-gray-200 mb-4">Competitividad por Naviera</h3>
           <ResponsiveContainer width="100%" height={300}>
             <RadarChartDynamic cx="50%" cy="50%" outerRadius="80%" data={[
                { subject: 'Costo', carrierA: 80, carrierB: 60, carrierC: 90 },
                { subject: 'Tiempo', carrierA: 70, carrierB: 90, carrierC: 60 },
                { subject: 'Fiabilidad', carrierA: 60, carrierB: 80, carrierC: 70 },
                { subject: 'BAF', carrierA: 90, carrierB: 70, carrierC: 80 },
                { subject: 'Volumen', carrierA: 85, carrierB: 65, carrierC: 95 },
             ]}>
              <PolarGridDynamic />
              <PolarAngleAxisDynamic dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <PolarRadiusAxisDynamic angle={30} domain={[0, 100]} />
              <RadarDynamic name="Carrier A" dataKey="carrierA" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
              <RadarDynamic name="Carrier B" dataKey="carrierB" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
              <RadarDynamic name="Carrier C" dataKey="carrierC" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
              <Tooltip />
            </RadarChartDynamic>
          </ResponsiveContainer>
        </div>
      )}

      <CurrencyFxConfigHub
        fxNotification={fxNotification}
        setFxNotification={setFxNotification}
        defaultCurrency={defaultCurrency}
        setDefaultCurrency={setDefaultCurrency}
        displayCurrency={displayCurrency}
        setDisplayCurrency={setDisplayCurrency}
        toastNotice={toastNotice}
        addFxLog={addFxLog}
        exchangeRates={exchangeRates}
        setExchangeRates={setExchangeRates}
        handleExchangeRateChange={handleExchangeRateChange}
        fxLogs={fxLogs}
      />

      {/* PANEL DE CONTROL INTERACTIVO - AJUSTE MANUAL BAF Y COSTO TOTAL PROYECTADO */}
      {isClient && (
        <div id="rates-baf-simulator-control-panel" className="bg-[#111114] border border-gray-800 rounded-2xl p-6 space-y-6 animate-in fade-in duration-350">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-gray-800/60 font-sans">
            <div className="space-y-1">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Planificador Financiero FCL & LCL
              </span>
              <h3 className="text-sm font-extrabold text-white tracking-tight uppercase">
                Simulador de Costo Total Proyectado y Ajuste BAF
              </h3>
              <p className="text-[11px] text-gray-400 max-w-2xl leading-relaxed">
                Evalúe el impacto directo de las fluctuaciones de combustible o renegociaciones de contrato de flete marítimo aplicando un factor de ajuste manual sobre el recargo de combustible (BAF Surcharge).
              </p>
            </div>

            {/* Quick volume indicator */}
            <div className="flex items-center gap-2 bg-[#09090B] border border-gray-800 px-3 py-1.5 rounded-xl text-xs shrink-0 self-stretch sm:self-auto justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider font-mono">Volumen Operativo:</span>
                <strong className="text-[11px] font-mono text-blue-400 block whitespace-nowrap">
                  {(bafSimulatedVolume * 12).toLocaleString()} TEUs / año
                </strong>
              </div>
            </div>
          </div>

          {/* Adjuster Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
            {/* Slider Column */}
            <div className="lg:col-span-7 bg-[#0A0A0B] border border-gray-800/60 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  Factor de Ajuste BAF Manual
                </span>
                <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 font-mono text-xs font-black">
                  {bafManualAdjustment}%
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="250"
                  step="5"
                  value={bafManualAdjustment}
                  onChange={e => setBafManualAdjustment(parseInt(e.target.value) || 100)}
                  className="w-full h-2 bg-[#1C1C22] rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>0% (Exención)</span>
                  <span>100% (Estándar de Contrato)</span>
                  <span>250% (Escalada Extrema)</span>
                </div>
              </div>

              {/* Quick presets buttons */}
              <div className="space-y-1.5">
                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">Escenarios de Simulación BAF</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBafManualAdjustment(0)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer select-none ${bafManualAdjustment === 0 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-[#121216] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'}`}
                  >
                    Exención BAF (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBafManualAdjustment(60)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer select-none ${bafManualAdjustment === 60 ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-[#121216] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'}`}
                  >
                    Tarifa Baja Carbono (60%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBafManualAdjustment(100)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer select-none ${bafManualAdjustment === 100 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-[#121216] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'}`}
                  >
                    Estándar/Negociado (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBafManualAdjustment(150)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer select-none ${bafManualAdjustment === 150 ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-[#121216] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'}`}
                  >
                    Recargo por Crisis (+150%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBafManualAdjustment(220)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer select-none ${bafManualAdjustment === 220 ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-[#121216] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'}`}
                  >
                    Shock Combustible (+220%)
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Impact Overview Card Column */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#121216] to-[#0A0A0C] border border-gray-800 rounded-xl p-5 flex flex-col justify-between self-stretch">
              {(() => {
                const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' as CurrencyType : displayCurrency;
                const currSymbol = formatCurrencySymbol(targetCurr);

                // Calculate summary logistics
                let totalBaseFreight = 0;
                let totalOriginalBaf = 0;
                let totalAdjustedBaf = 0;

                rates.forEach(rate => {
                  const annualVolumeContribution = (bafSimulatedVolume * 12) / rates.length; 
                  const baseConv = convertAmount(rate.baseRate, rate.currency, targetCurr);
                  const bafConv = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);

                  totalBaseFreight += baseConv * annualVolumeContribution;
                  totalOriginalBaf += bafConv * annualVolumeContribution;
                  totalAdjustedBaf += (bafConv * (bafManualAdjustment / 100)) * annualVolumeContribution;
                });

                const totalOriginalFreightCost = totalBaseFreight + totalOriginalBaf;
                const totalProjectedFreightCost = totalBaseFreight + totalAdjustedBaf;
                const varianceAmount = totalProjectedFreightCost - totalOriginalFreightCost;
                const percentChange = totalOriginalFreightCost > 0 ? (varianceAmount / totalOriginalFreightCost) * 100 : 0;

                return (
                  <div className="space-y-4 h-full flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">Proyección Financiera Anual Operativa</span>
                      
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-800/40 font-sans">
                        <div>
                          <span className="text-[9px] text-gray-500 block font-bold uppercase">Costo Base Original:</span>
                          <strong className="text-sm font-mono text-gray-300 font-extrabold block">
                            {currSymbol}{totalOriginalFreightCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 block font-bold uppercase">Costo Con Ajuste BAF:</span>
                          <strong className="text-sm font-mono text-white font-black block">
                            {currSymbol}{totalProjectedFreightCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </strong>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-[10.5px] text-gray-400 font-semibold font-sans">Desviación Presupuestaria:</span>
                        <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 ${varianceAmount < 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : varianceAmount > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-gray-800 text-gray-400'}`}>
                          {varianceAmount < 0 ? "↓" : varianceAmount > 0 ? "↑" : ""}
                          {currSymbol}{Math.abs(varianceAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({percentChange.toFixed(1)}%)
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Action Call / Summary Text */}
                    <div className={`p-3 rounded-lg border text-[10.5px] mt-2 font-sans ${varianceAmount < 0 ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-100' : varianceAmount > 0 ? 'bg-rose-950/20 border-rose-900/30 text-rose-100' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                      {varianceAmount < 0 ? (
                        <span>
                          🎉 <strong>Eficiencia Logística:</strong> El escenario de ajuste al {bafManualAdjustment}% representa un ahorro neto de fletes de <strong className="text-emerald-400 font-mono">{currSymbol}{Math.abs(varianceAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })} {targetCurr}</strong> en base a su flujo de flete simulado.
                        </span>
                      ) : varianceAmount > 0 ? (
                        <span>
                          ⚠️ <strong>Acción de Cobertura Requerida:</strong> Este ajuste de BAF incrementaría las tarifas consolidadas de flete en <strong className="text-rose-400 font-mono">{currSymbol}{Math.abs(varianceAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })} {targetCurr}</strong>. Se aconseja negociar cláusulas de &quot;Fuel Cap&quot; o flete &quot;All-In&quot;.
                        </span>
                      ) : (
                        <span>
                          🤝 El recargo BAF se encuentra operando exactamente según las directrices estándar sin desvíos de presupuesto estimados.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Table of Carriers / Container impact breakdown */}
          <div className="space-y-2 font-sans pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-tight">Desglose Técnico de Impacto de Fletes por Contenedor (TEU)</span>
              <span className="text-[10px] text-gray-500 font-mono">Conversión en Tiempo Real @ {displayCurrency === 'ORIGINAL' ? 'Original' : displayCurrency}</span>
            </div>

            <div className="overflow-x-auto border border-gray-800/80 rounded-xl bg-gray-950/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-[#09090C] text-[10.5px] text-gray-400 uppercase font-sans font-bold">
                    <th className="p-3">Naviera & Modalidad</th>
                    <th className="p-3">Puerto Origen/Destino</th>
                    <th className="p-3 text-right">Flete Base</th>
                    <th className="p-3 text-right">BAF Contratado</th>
                    <th className="p-3 text-right text-amber-400">BAF Sim. ({bafManualAdjustment}%)</th>
                    <th className="p-3 text-right">Costo Total Std.</th>
                    <th className="p-3 text-right text-blue-400">Costo Total Proy.</th>
                    <th className="p-3 text-right">Desviación Unit.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {rates.slice(0, 10).map(rate => {
                    const targetCurr = displayCurrency === 'ORIGINAL' ? rate.currency : displayCurrency;
                    const unitSymbol = formatCurrencySymbol(targetCurr);

                    const baseRel = convertAmount(rate.baseRate, rate.currency, targetCurr);
                    const bafSurchargeRel = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
                    const bafSimRel = bafSurchargeRel * (bafManualAdjustment / 100);

                    const originalTotal = baseRel + bafSurchargeRel;
                    const simulatedTotal = baseRel + bafSimRel;
                    const containerVariance = simulatedTotal - originalTotal;

                    return (
                      <tr key={`${rate.id}-sim-row`} className="hover:bg-slate-900/20 transition duration-150">
                        <td className="p-3 font-sans">
                          <div className="font-semibold text-gray-200">{rate.carrier}</div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-[#121216] border border-gray-800 px-1 py-0.25 rounded text-[9.5px] font-mono font-bold text-blue-300">
                              {rate.equipment}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span>Modo: {rate.mode}</span>
                          </div>
                        </td>
                        <td className="p-3 font-sans text-gray-300">
                          <span className="font-bold">{rate.pol}</span>
                          <span className="text-gray-500 px-1">→</span>
                          <span className="font-bold">{rate.pod}</span>
                        </td>
                        <td className="p-3 text-right text-gray-300 font-semibold">
                          {unitSymbol}{baseRel.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                        </td>
                        <td className="p-3 text-right text-gray-400">
                          {unitSymbol}{bafSurchargeRel.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                        </td>
                        <td className="p-3 text-right text-amber-400 font-bold">
                          {unitSymbol}{bafSimRel.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                        </td>
                        <td className="p-3 text-right text-gray-300">
                          {unitSymbol}{originalTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                        </td>
                        <td className="p-3 text-right text-blue-400 font-bold">
                          {unitSymbol}{simulatedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                        </td>
                        <td className="p-3 text-right font-black">
                          <span className={containerVariance < 0 ? 'text-emerald-400' : containerVariance > 0 ? 'text-rose-400' : 'text-gray-400'}>
                            {containerVariance < 0 ? '-' : containerVariance > 0 ? '+' : ''}
                            {unitSymbol}{Math.abs(containerVariance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Historical price comparison Recharts chart */}
      {isClient && (
        <div id="rates-historical-section" className="bg-[#111114] border border-gray-800 rounded-xl p-6 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800/60 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                Evolución de Tarifas y Comparativa de Mercado (6 Meses)
              </h3>
              <p className="text-[11px] text-gray-400">
                Visualice el comportamiento de las tarifas de flete internacional histórico y compare cotizaciones entre diferentes líneas navieras.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Perspective Selector */}
              <div className="bg-[#0A0A0B] border border-gray-800 rounded p-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setHistoricalViewMode('BASE_RATES')}
                  className={`px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-all duration-250 ${historicalViewMode === 'BASE_RATES' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-900'}`}
                >
                  📈 Flete Base
                </button>
                <button
                  type="button"
                  onClick={() => setHistoricalViewMode('BAF_OIL_CORRELATION')}
                  className={`px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-all duration-250 flex items-center gap-1 ${historicalViewMode === 'BAF_OIL_CORRELATION' ? 'bg-amber-500 text-gray-950 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-900'}`}
                >
                  ⛽ Correlación BAF/Petróleo
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Ruta Activa:</span>
                <select 
                  value={selectedHistoryRoute}
                  onChange={e => setSelectedHistoryRoute(e.target.value)}
                  className="bg-[#0A0A0B] border border-gray-800 rounded px-3 py-1.5 text-xs text-white font-semibold cursor-pointer focus:border-blue-500 focus:outline-none"
                >
                  {Array.from(new Set(rates.map(r => `${r.pol} → ${r.pod}`))).map(route => (
                    <option key={route} value={route}>
                      📍 {route}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {historicalViewMode === 'BASE_RATES' && (
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-[#09090B] p-4 rounded-xl border border-gray-800/80">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 font-sans uppercase tracking-wider">
                  <Sliders className="w-4 h-4 text-blue-400 animate-pulse" />
                  Comparativa de Volatilidad (Flete Base vs BAF)
                </span>
                <p className="text-[11px] text-gray-400">
                  Modifique la vista para contrastar las dinámicas tarifarias del flete base frente al recargo BAF de cada naviera.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                {/* Carrier Filter inside Comparison section */}
                <div className="flex flex-wrap items-center gap-1 bg-[#111114] border border-gray-800 p-0.5 rounded-lg">
                  <span className="text-[10px] text-gray-500 font-bold uppercase px-2 select-none">Foco:</span>
                  <button
                    type="button"
                    onClick={() => setIsolatedHistoricalCarrier('ALL')}
                    className={`px-2 py-1 text-[11px] font-sans font-bold rounded cursor-pointer transition ${isolatedHistoricalCarrier === 'ALL' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    Todas
                  </button>
                  {activeCarriersForSelectedRoute.map((carrier, idx) => (
                    <button
                      key={carrier}
                      type="button"
                      onClick={() => setIsolatedHistoricalCarrier(carrier)}
                      className={`px-2 py-1 text-[11px] font-sans font-bold rounded cursor-pointer transition flex items-center gap-1.5 ${isolatedHistoricalCarrier === carrier ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }} />
                      {carrier}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-[#111114] border border-gray-800 rounded-lg shadow-inner shrink-0">
                  <button
                    type="button"
                    onClick={() => setChartDisplayType('BASE_ONLY')}
                    className={`px-3 py-1.5 text-xs font-sans font-bold rounded cursor-pointer transition flex items-center gap-1.5 ${chartDisplayType === 'BASE_ONLY' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Alternar: Ver solo Flete Base histórico"
                  >
                    📈 Solo Flete
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartDisplayType('BAF_ONLY')}
                    className={`px-3 py-1.5 text-xs font-sans font-bold rounded cursor-pointer transition flex items-center gap-1.5 ${chartDisplayType === 'BAF_ONLY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Alternar: Ver solo Recargos BAF histórico"
                  >
                    ⛽ Solo BAF
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartDisplayType('COMPARATIVE')}
                    className={`px-3 py-1.5 text-xs font-sans font-bold rounded cursor-pointer transition flex items-center gap-1.5 ${chartDisplayType === 'COMPARATIVE' ? 'bg-[#4f46e5]/10 text-[#818cf8] border border-[#6366f1]/20 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Superponer: Superponer Flete Base contra BAF"
                  >
                    ⚖️ Superponer Ambos
                  </button>
                </div>
              </div>
            </div>
          )}

          {historicalViewMode === 'BAF_OIL_CORRELATION' && (
            <div id="baf-sensitivity-selector" className="bg-[#0A0A0B] p-5 rounded-xl border border-gray-800 flex flex-col gap-5 animate-in slide-in-from-top-4 duration-300">
              {/* Header and explanation */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-gray-800/60">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5 font-sans">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    Simulador & Resumen de Sensibilidad BAF (Proyección de Riesgo)
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Ajuste manualmente qué porcentaje de las variaciones del crudo Brent traslada cada naviera al cliente final en su recargo BAF.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-[#121216] px-3 py-1.5 rounded-lg border border-gray-800 shrink-0">
                  <span className="text-[10px] text-gray-500 font-mono font-bold uppercase">Impacto Crudo Brent:</span>
                  <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${oilChangePercentage === 0 ? 'text-gray-400 bg-gray-500/10' : oilChangePercentage > 0 ? 'text-rose-450 bg-rose-500/10' : 'text-emerald-450 bg-emerald-500/10'}`}>
                    {oilChangePercentage === 0 ? 'Estable (0%)' : oilChangePercentage > 0 ? `+${oilChangePercentage}%` : `${oilChangePercentage}%`}
                  </span>
                  {oilChangePercentage === 0 && (
                    <button 
                      onClick={() => setOilChangePercentage(50)}
                      className="text-[9px] bg-amber-500 hover:bg-amber-600 text-gray-950 font-sans font-bold px-1.5 py-0.5 rounded cursor-pointer transition shadow-sm"
                    >
                      Simular Alza (+50%)
                    </button>
                  )}
                </div>
              </div>

              {/* Grid: 2 Columns on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Sliders for settings */}
                <div className="space-y-5">
                  {/* Slider 1: Coeficiente de Traspaso (BAF Sensitivity) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] text-gray-300 font-bold font-sans flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Coeficiente de Sensibilidad BAF:
                      </label>
                      <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {bafSensitivity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="10"
                      value={bafSensitivity}
                      onChange={e => setBafSensitivity(parseInt(e.target.value) || 0)}
                      className="w-full h-1.5 bg-[#1E1E24] rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-gray-500">
                      <span>Absorción (0%)</span>
                      <span className="text-amber-400/80 font-semibold">Convenio Std (100%)</span>
                      <span>Traspaso Extremo (200%)</span>
                    </div>
                  </div>

                  {/* Slider 2: Simulated Volume of Containers */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] text-gray-300 font-bold font-sans flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Volumen Mensual Simulado:
                      </label>
                      <span className="text-xs font-mono font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {bafSimulatedVolume} TEU
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={bafSimulatedVolume}
                      onChange={e => setBafSimulatedVolume(parseInt(e.target.value) || 120)}
                      className="w-full h-1.5 bg-[#1E1E24] rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-gray-500">
                      <span>Mínimo (10 TEUs)</span>
                      <div className="flex gap-2">
                        <button onClick={() => setBafSimulatedVolume(100)} className="text-[9px] underline hover:text-white cursor-pointer">100</button>
                        <button onClick={() => setBafSimulatedVolume(250)} className="text-[9px] underline hover:text-white cursor-pointer">250</button>
                        <button onClick={() => setBafSimulatedVolume(500)} className="text-[9px] underline hover:text-white cursor-pointer">500</button>
                      </div>
                      <span>Máximo (1000 TEUs)</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Projected Savings or Additional Cost Summary Card */}
                <div className="bg-[#121216] border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
                  {(() => {
                    const impact = bafProjectedImpact;
                    const currencySymbol = formatCurrencySymbol(impact.targetCurr);
                    return (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider font-bold block">
                              Proyección de Desviación Financiera vs Convenio Estándar:
                            </span>
                            <span className="text-[11px] text-gray-300 block font-medium">
                              Ruta: <strong className="text-gray-100">{selectedHistoryRoute}</strong> para un flujo de <strong className="text-blue-400 font-mono">{bafSimulatedVolume} TEU</strong>.
                            </span>
                          </div>
                          <span className={`text-[10px] uppercase font-mono font-black tracking-wide px-2 py-0.5 rounded border ${
                            impact.delta === 0 
                              ? 'text-gray-400 bg-gray-500/5 border-gray-500/10'
                              : impact.showSavings 
                              ? 'text-emerald-405 bg-emerald-500/5 border-emerald-500/10' 
                              : 'text-rose-400 bg-rose-500/5 border-rose-500/10'
                          }`}>
                            {impact.delta === 0 ? 'Sin Desviación' : impact.showSavings ? 'Ahorro Proyectado' : 'Costo Adicional'}
                          </span>
                        </div>

                        {/* Large Metric Display */}
                        <div className="py-1 flex items-baseline gap-2">
                          <span className={`text-2xl font-mono font-black tracking-tight ${
                            impact.delta === 0 
                              ? 'text-gray-400' 
                              : impact.showSavings 
                              ? 'text-emerald-400' 
                              : 'text-red-400'
                          }`}>
                            {impact.delta === 0 ? '' : impact.showSavings ? '-' : '+'}
                            {currencySymbol}{impact.delta.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-gray-400 font-bold uppercase font-mono select-none">
                            {impact.targetCurr} {oilChangePercentage !== 0 && 'Total'}
                          </span>
                        </div>

                        {/* Breakdown block */}
                        <div className="bg-[#0A0A0B]/80 rounded p-2.5 space-y-1.5 border border-gray-850 text-[11px]">
                          <div className="flex justify-between text-gray-400">
                            <span>Estimación BAF Convenio Std (100%):</span>
                            <span className="font-mono text-gray-200">
                              {currencySymbol}{Math.round(impact.standardBafCost).toLocaleString()} {impact.targetCurr}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-400 border-b border-gray-850/60 pb-1.5 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Estimación BAF Ajustado ({bafSensitivity}%):
                            </span>
                            <span className="font-mono text-amber-400 font-bold">
                              {currencySymbol}{Math.round(impact.customBafCost).toLocaleString()} {impact.targetCurr}
                            </span>
                          </div>

                          {/* Dynamic descriptive note */}
                          <div className="text-[10px] text-gray-500 leading-relaxed font-sans">
                            {oilChangePercentage === 0 ? (
                              <span className="text-amber-500/90 font-medium block">
                                💡 El crudo Brent se encuentra estable (0%). Modifique la fluctuación de crudo abajo (Fuel Impact) para simular subidas o bajadas de mercado.
                              </span>
                            ) : impact.showSavings ? (
                              <span>
                                🎉 Al reducir la sensibilidad al <strong className="text-gray-300">{bafSensitivity}%</strong>, la naviera absorbe parte del alza del combustible Brent, resultando en un ahorro de fletes de <strong className="text-emerald-400 font-mono">{currencySymbol}{Math.round(impact.delta).toLocaleString()} {impact.targetCurr}</strong> para este volumen.
                              </span>
                            ) : impact.delta > 0 ? (
                              <span>
                                ⚠️ El incremento de sensibilidad al <strong className="text-gray-300">{bafSensitivity}%</strong> (o traspaso agresivo) traslada un cargo adicional de <strong className="text-red-400 font-mono">{currencySymbol}{Math.round(impact.delta).toLocaleString()} {impact.targetCurr}</strong> frente a la tarifa regulada estándar.
                              </span>
                            ) : (
                              <span>Excelente correlación calibrada con los recargos indexados de cada línea marítima contratada.</span>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Dynamic breakdown of carrier elasticity */}
              {activeCarriersForSelectedRoute.length > 0 && (
                <div className="border-t border-gray-800/60 pt-3">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-2 font-mono">
                    Sensibilidad Resultante por Línea Naviera (Ruta Activa):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {activeCarriersForSelectedRoute.map((carrier, idx) => {
                      const carrierSeed = carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
                      const currentElasticity = baseElasticity * (bafSensitivity / 100);
                      return (
                        <div key={carrier} className="flex justify-between items-center bg-[#111114] px-3 py-1.5 rounded text-[11px] border border-gray-850">
                          <span className="flex items-center gap-1.5 font-sans font-medium text-gray-300">
                            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }} />
                            {carrier}
                          </span>
                          <span className="font-mono text-amber-400 font-bold">
                            {(currentElasticity * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {historicalViewMode === 'BAF_OIL_CORRELATION' && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#09090B] p-4 rounded-xl border border-gray-800/80 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  Métrica de Correlación Activa
                </span>
                <p className="text-[11px] text-gray-400 font-sans max-w-xl">
                  Seleccione el modo de visualización: compare el valor absoluto de cada naviera con el crudo o active la <strong className="text-amber-400">Capa de Correlación Directa Base 100</strong>, donde se aprecia la co-variabilidad porcentual directa desde el primer mes.
                </p>
              </div>
              <div className="flex bg-[#111114] border border-gray-800 p-0.5 rounded-lg shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setCorrelationDisplayMode('ABSOLUTE')}
                  className={`px-3 py-1.5 text-[11px] font-sans font-bold rounded cursor-pointer transition ${correlationDisplayMode === 'ABSOLUTE' ? 'bg-amber-500 text-gray-950 font-black shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Valores Nominales (Eje Doble)
                </button>
                <button
                  type="button"
                  onClick={() => setCorrelationDisplayMode('NORMALIZED')}
                  className={`px-3 py-1.5 text-[11px] font-sans font-bold rounded cursor-pointer transition ${correlationDisplayMode === 'NORMALIZED' ? 'bg-amber-500 text-gray-950 font-black shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Capa de Correlación Base 100
                </button>
                <div className="w-px h-full bg-gray-800 mx-1" />
                <button
                  type="button"
                  onClick={() => setShowBrentOverlay(!showBrentOverlay)}
                  className={`px-3 py-1.5 text-[11px] font-sans font-bold rounded cursor-pointer transition flex items-center gap-1.5 ${showBrentOverlay ? 'bg-blue-600/10 text-blue-400 font-black shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                  title="Alternar: Superponer precio de Crudo Brent"
                >
                  {showBrentOverlay ? '◉' : '○'} Superponer Brent
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
             {/* Chart Area */}
             <div className="lg:col-span-3 h-72 relative overflow-hidden">
               <AnimatePresence mode="wait">
                 {activeCarriersForSelectedRoute.length === 0 ? (
                   <motion.div
                     key="no-data"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     transition={{ duration: 0.25 }}
                     className="h-full flex items-center justify-center text-gray-500 italic text-xs bg-[#0A0A0B] rounded-lg border border-gray-800"
                   >
                     No hay datos comparativos de carriers para la ruta seleccionada.
                   </motion.div>
                 ) : historicalViewMode === 'BASE_RATES' ? (
                   <motion.div
                     key="base-rates-chart"
                     initial={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
                     animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                     exit={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
                     transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                     className="h-full w-full"
                   >
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart
                         data={
                           chartDisplayType === 'BASE_ONLY'
                             ? historicalDataForRoute
                             : chartDisplayType === 'BAF_ONLY'
                             ? historicalBafSurchargesOnlyData
                             : historicalBaseVsBafData
                         }
                         margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                       >
                         <CartesianGrid stroke="#1e1e24" strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="month" 
                           stroke="#888888" 
                           fontSize={11} 
                           tickLine={false} 
                           axisLine={false} 
                         />
                         <YAxis 
                           stroke="#888888" 
                           fontSize={11} 
                           tickLine={false} 
                           axisLine={false}
                           tickFormatter={(val: number) => `${formatCurrencySymbol(displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency)}${val}`}
                         />
                         <Tooltip 
                           content={
                             <CustomChartTooltip 
                               displayCurrency={displayCurrency} 
                               formatCurrencySymbol={formatCurrencySymbol} 
                             />
                           }
                         />
                         <Legend 
                           verticalAlign="top" 
                           height={36} 
                           iconType="circle"
                           iconSize={8}
                           wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                         />
                         {chartDisplayType !== 'COMPARATIVE' ? (
                           activeCarriersForSelectedRoute
                             .filter(carrier => isolatedHistoricalCarrier === 'ALL' || carrier === isolatedHistoricalCarrier)
                             .map((carrier, idx) => {
                               const originalIdx = activeCarriersForSelectedRoute.indexOf(carrier);
                               return (
                                 <Line
                                   key={carrier}
                                   type="monotone"
                                   dataKey={carrier}
                                   name={carrier}
                                   stroke={LINE_COLORS[originalIdx % LINE_COLORS.length]}
                                   strokeWidth={2.5}
                                   activeDot={{ r: 6 }}
                                   dot={{ strokeWidth: 1, r: 4 }}
                                 />
                               );
                             })
                         ) : (
                           activeCarriersForSelectedRoute
                             .filter(carrier => isolatedHistoricalCarrier === 'ALL' || carrier === isolatedHistoricalCarrier)
                             .flatMap((carrier, idx) => {
                               const originalIdx = activeCarriersForSelectedRoute.indexOf(carrier);
                               return [
                                 <Line
                                   key={`${carrier}-base`}
                                   type="monotone"
                                   dataKey={`${carrier} (Base)`}
                                   name={`${carrier} (Flete Base)`}
                                   stroke={LINE_COLORS[originalIdx % LINE_COLORS.length]}
                                   strokeWidth={2.5}
                                   activeDot={{ r: 5 }}
                                   dot={{ strokeWidth: 1, r: 3 }}
                                 />,
                                 <Line
                                   key={`${carrier}-baf`}
                                   type="monotone"
                                   dataKey={`${carrier} (BAF)`}
                                   name={`${carrier} (Recargo BAF)`}
                                   stroke={LINE_COLORS[originalIdx % LINE_COLORS.length]}
                                   strokeWidth={1.5}
                                   strokeDasharray="4 4"
                                   activeDot={{ r: 4 }}
                                   dot={{ strokeWidth: 1, r: 2 }}
                                 />
                               ];
                             })
                         )}
                       </LineChart>
                     </ResponsiveContainer>
                   </motion.div>
                 ) : (
                   <motion.div
                     key="baf-oil-chart"
                     initial={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
                     animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                     exit={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
                     transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                     className="h-full w-full"
                   >
                      <ResponsiveContainer width="100%" height="100%">
                        {correlationDisplayMode === 'ABSOLUTE' ? (
                          <LineChart
                            data={historicalBAFOilCorrelationData}
                            margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
                          >
                            <CartesianGrid stroke="#1e1e24" strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#888888" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <YAxis 
                              yAxisId="left"
                              stroke="#888888" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false}
                              tickFormatter={(val: number) => `${formatCurrencySymbol(displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency)}${val}`}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              stroke="#f59e0b" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false}
                              tickFormatter={(val: number) => `$${val}`}
                            />
                            <Tooltip 
                              content={
                                <CustomChartTooltip 
                                  displayCurrency={displayCurrency} 
                                  formatCurrencySymbol={formatCurrencySymbol} 
                                />
                              }
                            />
                            <Legend 
                              verticalAlign="top" 
                              height={36} 
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                            />
                            {activeCarriersForSelectedRoute
                              .filter(carrier => isolatedHistoricalCarrier === 'ALL' || carrier === isolatedHistoricalCarrier)
                              .map((carrier, idx) => {
                                const originalIdx = activeCarriersForSelectedRoute.indexOf(carrier);
                                return (
                                  <Line
                                    key={carrier}
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey={`${carrier} (BAF)`}
                                    name={`${carrier} (BAF)`}
                                    stroke={LINE_COLORS[originalIdx % LINE_COLORS.length]}
                                    strokeWidth={2}
                                    activeDot={{ r: 5 }}
                                    dot={{ strokeWidth: 1, r: 3 }}
                                  />
                                );
                              })}
                            {showBrentOverlay && (
                                <Line
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="Crudo Brent (USD/bbl)"
                                  name="Brent Oil (USD/bbl)"
                                  stroke="#f59e0b"
                                  strokeWidth={3}
                                  strokeDasharray="4 4"
                                  activeDot={{ r: 7 }}
                                  dot={{ strokeWidth: 1, r: 4 }}
                                />
                            )}
                          </LineChart>
                        ) : (
                          <AreaChart
                            data={top3CarriersBafVolatility.data}
                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                          >
                            <defs>
                              {top3CarriersBafVolatility.carriers.map((carrier, index) => (
                                <linearGradient key={carrier} id={`colorArea${carrier}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={LINE_COLORS[index % LINE_COLORS.length]} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={LINE_COLORS[index % LINE_COLORS.length]} stopOpacity={0}/>
                                </linearGradient>
                              ))}
                            </defs>
                            <CartesianGrid stroke="#1e1e24" strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#888888" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <YAxis 
                              stroke="#888888" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false}
                              tickFormatter={(val: number) => `${val}%`}
                              domain={['dataMin - 5', 'dataMax + 5']}
                            />
                            <Tooltip 
                              content={
                                <CustomChartTooltip 
                                  displayCurrency={displayCurrency} 
                                  formatCurrencySymbol={formatCurrencySymbol} 
                                />
                              }
                            />
                            <Legend 
                              verticalAlign="top" 
                              height={36} 
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                            />
                            {top3CarriersBafVolatility.carriers.map((carrier, index) => (
                              <Area 
                                key={carrier}
                                type="monotone" 
                                dataKey={carrier} 
                                stroke={LINE_COLORS[index % LINE_COLORS.length]} 
                                fillOpacity={1} 
                                fill={`url(#colorArea${carrier})`} 
                              />
                            ))}
                            </AreaChart>
                        )}
                      </ResponsiveContainer>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

            {/* Smart Market Insights side block */}
            <div className="bg-[#0A0A0B] p-4 rounded-lg border border-gray-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {historicalViewMode === 'BASE_RATES' ? (
                  isolatedHistoricalCarrier !== 'ALL' ? (
                    (() => {
                      const item = volatilityBreakdown.find(v => v.carrier === isolatedHistoricalCarrier);
                      if (!item) return <p className="text-xs text-gray-500 italic">No hay datos de volatilidad para esta naviera.</p>;
                      const ratio = item.baseSwing > 0 ? (item.bafSwing / item.baseSwing).toFixed(1) : 'N/A';
                      const originalIdx = activeCarriersForSelectedRoute.indexOf(item.carrier);
                      return (
                        <>
                          <div className="flex items-center space-x-1.5 text-indigo-400 font-sans">
                            <Sliders className="w-4 h-4 text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Auditoría Individual BAF</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="p-3 bg-gray-950/50 border border-gray-800 rounded-lg space-y-2 text-[11px]">
                              <span className="text-[10px] font-bold uppercase text-gray-300 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: LINE_COLORS[originalIdx % LINE_COLORS.length] }} />
                                {item.carrier}
                              </span>
                              <div className="space-y-1.5 text-gray-400 font-mono text-[11px]">
                                <div className="flex justify-between">
                                  <span>Variación Flete:</span>
                                  <strong className="text-blue-400">{item.baseSwing.toFixed(1)}%</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Variación BAF:</span>
                                  <strong className="text-amber-400">{item.bafSwing.toFixed(1)}%</strong>
                                </div>
                                <div className="h-px bg-gray-850 my-1" />
                                <div className="flex justify-between font-bold">
                                  <span>Desviación Delta (Δ):</span>
                                  <span className={item.volatilityDiscrepancy > 15 ? 'text-rose-400' : 'text-emerald-400'}>
                                    {item.volatilityDiscrepancy > 0 ? '+' : ''}{item.volatilityDiscrepancy.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-gray-950/40 rounded border border-gray-805 text-[10.5px] leading-relaxed text-gray-400">
                              {item.volatilityDiscrepancy > 15 ? (
                                <span className="text-rose-400/90 font-medium">
                                  ⚠️ El BAF oscila <strong className="text-white">{ratio}x</strong> más rápido que la tarifa base. Esto denota una volatilidad desproporcionada que puede ocultar un margen comercial extra de la naviera.
                                </span>
                              ) : item.volatilityDiscrepancy < -10 ? (
                                <span className="text-gray-400 font-medium">
                                  ℹ️ El BAF permanece inusualmente estable frente a los movimientos de la tarifa base general.
                                </span>
                              ) : (
                                <span className="text-emerald-400/90 font-medium">
                                  ✅ Correlación óptima. Los recargos se comportan de manera sincrónica con el flete base internacional de la ruta.
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : chartDisplayType === 'BASE_ONLY' ? (
                    <>
                      <div className="flex items-center space-x-1.5 text-blue-500 font-sans">
                        <Info className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Métricas de Oferta</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="p-2.5 bg-gray-950/40 rounded border border-gray-800 flex flex-col gap-1">
                          <span className="text-[9px] text-gray-500 uppercase block">Mejor Tarifa Jun/26</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            {(() => {
                              const carriers = activeCarriersForSelectedRoute;
                              if (carriers.length === 0) return 'N/A';
                              const hist = historicalDataForRoute;
                              const juneData = hist[hist.length - 1] || {};
                              const ratesInJune = carriers.map(c => juneData[c]).filter(v => v !== undefined);
                              if (ratesInJune.length === 0) return 'N/A';
                              const min = Math.min(...ratesInJune);
                              const currSymbol = formatCurrencySymbol(displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency);
                              return `${currSymbol}${min.toLocaleString()} ${displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency}`;
                            })()}
                          </span>
                        </div>

                        <div className="p-2.5 bg-gray-950/40 rounded border border-gray-800/80">
                          <span className="text-[9px] text-gray-500 uppercase block">Rango de Variación SCM</span>
                          <span className="text-[11px] text-gray-300 font-medium block">
                            Fluctuación estacional estimada: <strong className="text-blue-400 font-mono">~18%</strong> en el primer trimestre.
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1.5 text-indigo-400 font-sans">
                        <Percent className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Volatilidad Flete vs BAF</span>
                      </div>
                      
                      <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                        {volatilityBreakdown.map(({ carrier, baseSwing, bafSwing, volatilityDiscrepancy }, idx) => (
                          <div key={carrier} className="p-2 bg-gray-950/40 rounded border border-gray-850 space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center font-semibold">
                              <span className="flex items-center gap-1 text-gray-300 truncate">
                                <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }} />
                                {carrier}
                              </span>
                              <span className={`text-[9px] px-1 rounded font-mono font-bold ${volatilityDiscrepancy > 0 ? 'text-rose-450 bg-rose-500/10' : 'text-emerald-450 bg-emerald-500/10'}`}>
                                Δ {volatilityDiscrepancy > 0 ? `+${volatilityDiscrepancy.toFixed(0)}%` : `${volatilityDiscrepancy.toFixed(0)}%`}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500 font-mono">
                              <div>Flete: <strong className="text-gray-300">{baseSwing.toFixed(0)}%</strong></div>
                              <div>BAF: <strong className="text-gray-300">{bafSwing.toFixed(0)}%</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-500 leading-snug">
                        💡 El indicador <strong>Δ (Delta)</strong> mide la disparidad de oscilación. Un delta positivo elevado denota recargos BAF inusualmente erráticos en relación a la tarifa base.
                      </p>
                    </>
                  )
                ) : (
                  <>
                    <div className="flex items-center space-x-1.5 text-amber-500 font-sans">
                      <Info className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Correlación BAF</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 bg-gray-950/40 rounded border border-gray-800 flex flex-col gap-1">
                        <span className="text-[9px] text-gray-500 uppercase block">Petróleo Brent actual</span>
                        <span className="text-sm font-bold text-amber-500 font-mono">
                          $85.00 USD <span className="text-[10px] text-gray-400 font-normal">/ bbl</span>
                        </span>
                      </div>

                      <div className="p-2.5 bg-gray-950/40 rounded border border-gray-800/80">
                        <span className="text-[9px] text-gray-500 uppercase block">Ajuste de Convenio</span>
                        <span className="text-[11px] text-gray-300 font-medium block leading-relaxed">
                          El recargo <strong className="text-amber-400">BAF</strong> muestra un coeficiente de correlación de <strong className="text-blue-400">{Math.min(1.0, 0.92 * (bafSensitivity / 100)).toFixed(2)}</strong> con el crudo, reflejando el retraso estándar de indexación de 30 días.
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="text-[9.5px] text-gray-400 leading-relaxed pt-2 border-t border-gray-800">
                {historicalViewMode === 'BASE_RATES' 
                  ? chartDisplayType === 'COMPARATIVE'
                    ? "Línea continua = Flete Base, Líneas discontinuas = Recargo BAF. Ideal para identificar discrepancias artificiales de volatilidad entre fletes base y BAF."
                    : "La comparativa utiliza el calculador multidivisa. Se recomienda cerrar contratos anuales antes del peak season del tercer trimestre."
                  : "La línea discontinua representa el precio del crudo Brent (eje derecho en USD/bbl), y las líneas continuas de cada línea naviera detallan el ajuste BAF (eje izquierdo)."
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table: BAF Deviation & Annual Projected Savings */}
      {isClient && rates.length > 0 && (
        <div id="baf-savings-optimization-table" className="bg-[#111114] border border-gray-800 rounded-xl p-6 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/60 pb-3 font-sans">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Optimización y Ahorro Anual Proyectado (BAF Estructural)
              </h3>
              <p className="text-[11px] text-gray-400 font-sans">
                Auditoría sistémica de la volatilidad del combustible por ruta comercial. Concentrar sus embarques en la ruta con menor desviación estacional ayuda a atenuar recargos injustificados. 
              </p>
            </div>
            
            <div className="bg-[#0A0A0B] border border-gray-800 px-3 py-1.5 rounded text-xs flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">Volumen Proyectado Anual:</span>
              <span className="font-mono font-bold text-[11px] text-blue-400">
                {(bafSimulatedVolume * 12).toLocaleString()} TEUs
              </span>
            </div>
          </div>

          {/* SIMULADOR INTERACTIVO DE ESCENARIOS DE VOLUMEN ANUAL */}
          <div className="bg-[#0A0A0B] border border-gray-800/80 p-5 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  Simulador de Escenarios Operativos y Volatilidad (FCL / LCL)
                </span>
                <h4 className="text-xs font-bold text-gray-200 uppercase tracking-tight">
                  Ajustar Escenario de Flujo de Carga Marítima Anual
                </h4>
              </div>

              {/* Volume Indicator */}
              <div className="flex items-center gap-2 bg-[#121216] border border-gray-800 px-3 py-1.5 rounded-lg shrink-0">
                <span className="text-[10px] text-gray-400 font-bold font-mono">Simulando:</span>
                <strong className="text-xs font-mono font-black text-blue-400">
                  {(bafSimulatedVolume * 12).toLocaleString()} TEUs / año
                </strong>
                <span className="text-[10px] text-gray-500 font-mono">
                  (~{bafSimulatedVolume} TEUs/mes)
                </span>
              </div>
            </div>

            {/* Range slider & Quick Presets */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center font-sans">
              <div className="lg:col-span-12 xl:col-span-7 space-y-2">
                <input
                  type="range"
                  min="120"
                  max="24000"
                  step="120"
                  value={bafSimulatedVolume * 12}
                  onChange={e => {
                    const annual = parseInt(e.target.value) || 1200;
                    setBafSimulatedVolume(Math.round(annual / 12));
                  }}
                  className="w-full h-1.5 bg-[#1E1E24] rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-gray-500">
                  <span>Volumen Mínimo (120 TEUs/año)</span>
                  <span>Volumen Máximo (24,000 TEUs/año)</span>
                </div>
              </div>

              <div className="lg:col-span-12 xl:col-span-5 flex flex-wrap gap-2 justify-start sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBafSimulatedVolume(Math.round(500 / 12))}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded border cursor-pointer transition ${bafSimulatedVolume * 12 >= 450 && bafSimulatedVolume * 12 <= 550 ? 'bg-[#3F83F8] border-[#3F83F8] text-white font-bold' : 'bg-[#111114] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}
                >
                  FCL-Lite (500 TEUs)
                </button>
                <button
                  type="button"
                  onClick={() => setBafSimulatedVolume(Math.round(2500 / 12))}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded border cursor-pointer transition ${bafSimulatedVolume * 12 >= 2400 && bafSimulatedVolume * 12 <= 2600 ? 'bg-[#3F83F8] border-[#3F83F8] text-white font-bold' : 'bg-[#111114] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}
                >
                  Standard (2.5k TEUs)
                </button>
                <button
                  type="button"
                  onClick={() => setBafSimulatedVolume(Math.round(10000 / 12))}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded border cursor-pointer transition ${bafSimulatedVolume * 12 >= 9500 && bafSimulatedVolume * 12 <= 10500 ? 'bg-[#3F83F8] border-[#3F83F8] text-white font-bold' : 'bg-[#111114] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}
                >
                  Enterprise (10k TEUs)
                </button>
                <button
                  type="button"
                  onClick={() => setBafSimulatedVolume(Math.round(20000 / 12))}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded border cursor-pointer transition ${bafSimulatedVolume * 12 >= 19500 && bafSimulatedVolume * 12 <= 20500 ? 'bg-[#3F83F8] border-[#3F83F8] text-white font-bold' : 'bg-[#111114] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}
                >
                  Consolidator (20k TEUs)
                </button>
              </div>
            </div>

            {/* Impact Details cards showing dynamic calculations on routing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-800/55">
              {(() => {
                const metrics = getRouteBafMetrics();
                if (metrics.length === 0) return null;
                const sorted = [...metrics].sort((a,b) => b.stdDev - a.stdDev);
                const worstRoute = sorted[0]; // Highest volatility
                const bestRoute = [...metrics].sort((a,b) => a.stdDev - b.stdDev)[0]; // Lowest volatility
                
                const currSymbol = formatCurrencySymbol(displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency);
                const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;

                const worstDeviationCost = convertAmount(worstRoute.stdDev * (bafSimulatedVolume * 12), 'USD', targetCurr);
                const bestDeviationCost = convertAmount(bestRoute.stdDev * (bafSimulatedVolume * 12), 'USD', targetCurr);
                
                const worstTotalCostBaf = convertAmount(worstRoute.annualCost, 'USD', targetCurr);
                const bestTotalCostBaf = convertAmount(bestRoute.annualCost, 'USD', targetCurr);

                // Let's get simulated difference (loss / risk mitigation cost)
                const relativeRiskDiff = Math.max(0, worstTotalCostBaf - bestTotalCostBaf);

                return (
                  <>
                    <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-1 font-sans">
                      <span className="text-[9.5px] text-gray-400 font-bold uppercase block tracking-wider">Incertidumbre de Desviación BAF</span>
                      <p className="text-[10.5px] text-gray-400 leading-normal">
                        Rango de volatilidad estacional proyectado sobre tarifas anuales estimadas por desviación de BAF:
                      </p>
                      <div className="flex gap-2 items-center pt-1.5 justify-between">
                        <div className="text-[10px] font-mono">
                          Mínimo Riesgo: <strong className="text-emerald-400">±{currSymbol}{bestDeviationCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </div>
                        <div className="text-[10px] font-mono">
                          Máximo Riesgo: <strong className="text-rose-400">±{currSymbol}{worstDeviationCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-1 font-sans">
                      <span className="text-[9.5px] text-gray-400 font-bold uppercase block tracking-wider">Costo Excesivo de Desviación</span>
                      <p className="text-[10.5px] text-gray-400 leading-normal">
                        Pérdida logística potencial o sobrecosto evitable al consolidar carga en rutas de alta fluctuación:
                      </p>
                      <div className="pt-2 font-mono flex items-center justify-between">
                        <span className="text-[10.5px] text-gray-400">Variación Máxima:</span>
                        <strong className="text-amber-500 text-xs font-black">
                          +{currSymbol}{relativeRiskDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })} {targetCurr}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-950/15 border border-blue-900/30 rounded-lg space-y-1 font-sans">
                      <span className="text-[9.5px] text-blue-400 font-bold uppercase block tracking-wider">Plan de Mitigación Estratégico</span>
                      <p className="text-[11px] text-blue-100 leading-relaxed">
                        Para <strong className="text-blue-300 font-mono">{(bafSimulatedVolume * 12).toLocaleString()} TEUs</strong>, concentrar allocations en la ruta de menor desviación <strong className="text-white">{bestRoute.route}</strong> atempera el riesgo del combustible en un flete total.
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* KPI Dashboard - Savings and comparator */}
          {(() => {
            const metrics = getRouteBafMetrics();
            if (metrics.length === 0) return null;

            // Sort by stdDev ascending to get lowest BAF deviation route
            const sortedByDev = [...metrics].sort((a, b) => a.stdDev - b.stdDev);
            const lowestDevRoute = sortedByDev[0];

            // Calculate average of all active routes
            const avgAnnualCostAllRoutes = metrics.reduce((sum, r) => sum + r.annualCost, 0) / metrics.length;
            
            const projectedAnnualSavings = Math.max(0, avgAnnualCostAllRoutes - lowestDevRoute.annualCost);
            const displayCurr = displayCurrency === 'ORIGINAL' ? 'USD' as CurrencyType : displayCurrency;

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0A0A0B] p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Ruta de Menor Desviación BAF</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-blue-400 truncate">{lowestDevRoute.route}</h4>
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">
                      Desviación Estándar: <strong className="text-emerald-400">±{(() => {
                        const amount = convertAmount(lowestDevRoute.stdDev, 'USD', displayCurr);
                        return `${formatCurrencySymbol(displayCurr)}${amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
                      })()}</strong>
                    </span>
                  </div>
                </div>

                <div className="bg-[#0A0A0B] p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Costo BAF Anual Proyectado (Ruta Estable)</span>
                  <div>
                    <h4 className="text-lg font-black text-white font-mono">
                      {(() => {
                        const amount = convertAmount(lowestDevRoute.annualCost, 'USD', displayCurr);
                        return `${formatCurrencySymbol(displayCurr)}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${displayCurr}`;
                      })()}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">
                      Costo mensual prom.: {(() => {
                        const amount = convertAmount(lowestDevRoute.avgBaf * bafSimulatedVolume, 'USD', displayCurr);
                        return `${formatCurrencySymbol(displayCurr)}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="bg-[#0A0A0B] p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Costo Promedio de Rutas Activas</span>
                  <div>
                    <h4 className="text-lg font-black text-gray-400 font-mono">
                      {(() => {
                        const amount = convertAmount(avgAnnualCostAllRoutes, 'USD', displayCurr);
                        return `${formatCurrencySymbol(displayCurr)}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${displayCurr}`;
                      })()}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">
                      Promedio de {metrics.length} rutas del tarifario
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <TrendingDown className="w-16 h-16 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">Ahorro Anual Proyectado</span>
                  <div>
                    <h4 className="text-xl font-black text-emerald-400 font-mono flex items-center gap-1.5 animate-pulse">
                      <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0" />
                      {(() => {
                        const amount = convertAmount(projectedAnnualSavings, 'USD', displayCurr);
                        return `${formatCurrencySymbol(displayCurr)}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${displayCurr}`;
                      })()}
                    </h4>
                    <span className="text-[10px] text-emerald-500/80 font-medium block mt-1">
                      Desviación Relativa: <strong className="text-white">{lowestDevRoute.deviationPercentage.toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Volatility Area Chart Section */}
          {(() => {
            const { data, carriers } = top3CarriersBafVolatility;
            if (carriers.length === 0) return null;
            const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
            const symbol = formatCurrencySymbol(targetCurr);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0E0E11] p-5 rounded-xl border border-gray-800/60 font-sans">
                {/* Left side: Area Chart of Volatility */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Simulador de Volatilidad Mensual BAF (Top 3 Navieras por TEUs)
                      </h4>
                      <p className="text-[10.5px] text-gray-400">
                        Proyección semestral con fluctuaciones del crudo Brent para <span className="text-blue-400 font-semibold">{selectedHistoryRoute}</span>.
                      </p>
                    </div>
                  </div>

                  <div className="h-[210px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCarrier0" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3f83f8" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#3f83f8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCarrier1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCarrier2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6b7280" 
                          fontSize={10.5}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(val: number) => `${symbol}${val}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111114', borderColor: '#1f2937', color: '#e5e7eb', fontSize: '11px', borderRadius: '8px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#9ca3af', marginBottom: '4px' }}
                        />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        {carriers.map((carrier, idx) => {
                          const colors = ['#3f83f8', '#10b981', '#f59e0b'];
                          const color = colors[idx % colors.length];
                          return (
                            <Area
                              key={carrier}
                              type="monotone"
                              dataKey={carrier}
                              name={carrier}
                              stroke={color}
                              strokeWidth={2}
                              fillOpacity={1}
                              fill={`url(#colorCarrier${idx})`}
                            />
                          );
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right side: Volatility risk & sensitivity analytics */}
                <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-800/80 pt-4 lg:pt-0 lg:pl-5 space-y-4">
                  <div className="space-y-3">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Auditoría Operativa de Capacidad</span>
                    
                    <div className="space-y-2.5">
                      {(() => {
                        if (!selectedHistoryRoute) return null;
                        const [polVal, podVal] = selectedHistoryRoute.split(' → ');
                        const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);

                        const sortedCarriers = [...matchingRates]
                          .sort((a, b) => (b.allocationsTeu || 0) - (a.allocationsTeu || 0));
                        
                        const uniqueCarriersMap = new Map<string, typeof rates[0]>();
                        sortedCarriers.forEach(rate => {
                          if (!uniqueCarriersMap.has(rate.carrier)) {
                            uniqueCarriersMap.set(rate.carrier, rate);
                          }
                        });
                        const top3 = Array.from(uniqueCarriersMap.values()).slice(0, 3);
                        const colors = ['text-blue-400', 'text-emerald-400', 'text-amber-400'];

                        return top3.map((rate, idx) => {
                          const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                          const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
                          const elasticity = baseElasticity * (bafSensitivity / 100);

                          return (
                            <div key={rate.id} className="p-2.5 bg-[#0A0A0B]/80 rounded border border-gray-800/60 text-xs flex flex-col gap-1">
                              <div className="flex justify-between items-center font-sans">
                                <span className={`font-bold ${colors[idx % colors.length]}`}>{rate.carrier}</span>
                                <span className="bg-gray-800 text-gray-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                                  {rate.allocationsTeu ? `${rate.allocationsTeu} TEUs` : 'N/A'}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 flex justify-between items-center font-mono mt-0.5">
                                <span>Elasticidad Combustible:</span>
                                <span className="text-gray-300 font-bold">{elasticity.toFixed(2)}x</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-950/20 rounded border border-blue-900/30 text-[10px] text-blue-300 leading-normal">
                    📊 El sombreado de área representa la exposición acumulativa. Navieras con menor pendiente indican fórmulas de indexación estables frente a las oscilaciones de combustible.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Table */}
          <div className="overflow-x-auto border border-gray-800 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950/60 text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-800 font-sans">
                  <th className="p-3">Ruta Comercial Activa (POL → POD)</th>
                  <th className="p-3 text-center">Nº Contratos</th>
                  <th className="p-3 text-right">Desviación Estándar BAF</th>
                  <th className="p-3 text-right">Coef. Volatilidad BAF</th>
                  <th className="p-3 text-right text-blue-400 font-bold font-sans">Costo BAF Anual Est.</th>
                  <th className="p-3 text-center">Estatus Nivel de Riesgo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850 text-xs">
                {(() => {
                  const metrics = getRouteBafMetrics();
                  const sortedMetrics = [...metrics].sort((a,b) => a.deviationPercentage - b.deviationPercentage);
                  const displayCurr = displayCurrency === 'ORIGINAL' ? 'USD' as CurrencyType : displayCurrency;

                  return sortedMetrics.map((item) => {
                    const statusConfig = item.deviationPercentage < 8 
                      ? { text: 'Estabilidad Alta', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                      : item.deviationPercentage <= 15 
                      ? { text: 'Media (Estándar)', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
                      : { text: 'Alta Volatilidad', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };

                    return (
                      <tr 
                        key={item.route} 
                        className={`transition-colors hover:bg-gray-950/40 font-mono ${item.route === selectedHistoryRoute ? 'bg-blue-950/10 border-l-2 border-l-blue-500' : ''}`}
                      >
                        <td className="p-3 font-semibold text-gray-100 flex items-center gap-2 font-sans">
                          {item.deviationPercentage > 15 && (
                            <div className="flex items-center justify-center p-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded shadow-[0_0_8px_rgba(244,63,94,0.15)] animate-pulse" title="Alerta de Riesgo (>15% Desviación)">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="text-[10px] bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded text-gray-400">Ruta</span>
                          {item.route}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-300">
                          {item.carriersCount}
                        </td>
                        <td className="p-3 text-right text-gray-400">
                          ±{(() => {
                            const amount = convertAmount(item.stdDev, 'USD', displayCurr);
                            return `${formatCurrencySymbol(displayCurr)}${amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
                          })()}
                        </td>
                        <td className="p-3 text-right text-amber-400 font-bold">
                          {item.deviationPercentage.toFixed(1)}%
                        </td>
                        <td className="p-3 text-right font-bold text-gray-100">
                          {(() => {
                            const amount = convertAmount(item.annualCost, 'USD', displayCurr);
                            return `${formatCurrencySymbol(displayCurr)}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${displayCurr}`;
                          })()}
                        </td>
                        <td className="p-3 text-center font-sans">
                          <span className={`inline-block text-[9.5px] font-bold px-2.5 py-1 rounded-full border ${statusConfig.bg}`}>
                            {statusConfig.text}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
          <div className="p-3.5 bg-blue-950/20 rounded-lg border border-blue-900/30 text-[10.5px] text-blue-300 leading-relaxed font-sans">
            💡 <strong>Análisis Logístico Marítimo (BAF):</strong> La menor desviación del BAF denota que los recargos por combustible de esa ruta se comportan de forma estable y no sufren fluctuaciones bruscas arbitrarias. Seleccionar contratos anualizados en rutas más estables permite limitar la incertidumbre presupuestaria de furgón ante picos de crudo Brent.
          </div>
        </div>
      )}

      {/* Dynamic BAF Simulator & Oil Price Impact Panel */}
      <div id="baf-simulator-panel" className="bg-[#111114] border border-gray-800 rounded-xl p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800/60 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              Simulador de Impacto de Combustible (BAF) y Costo Total
            </h3>
            <p className="text-[11px] text-gray-400">
              Simule variaciones en el precio internacional del crudo para analizar el impacto directo en el recargo BAF (Bunker Adjustment Factor) y el costo final de los fletes.
            </p>
          </div>
          <div className="bg-[#0A0A0B] border border-gray-800 px-3 py-1.5 rounded text-xs flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Estado de simulación:</span>
            <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${oilChangePercentage === 0 ? 'text-gray-400 bg-gray-500/10' : oilChangePercentage > 0 ? 'text-rose-450 bg-rose-500/10' : 'text-emerald-450 bg-emerald-500/10'}`}>
              {oilChangePercentage === 0 ? 'NEUTRAL (Tarifa Base)' : oilChangePercentage > 0 ? `+${oilChangePercentage}% COMB` : `${oilChangePercentage}% COMB`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Scenarios (5 Cols) */}
          <div className="lg:col-span-5 space-y-5 border-r border-gray-800/40 pr-0 lg:pr-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-medium font-sans flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-blue-400" />
                  Fluctuación del Precio del Petróleo:
                </span>
                <span className={`font-mono font-black text-sm px-2 py-0.5 rounded ${oilChangePercentage === 0 ? 'text-gray-400' : oilChangePercentage > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
                  {oilChangePercentage > 0 ? `+${oilChangePercentage}%` : `${oilChangePercentage}%`}
                </span>
              </div>
              
              {/* Slider */}
              <input 
                type="range"
                min="-50" 
                max="150" 
                step="5"
                value={oilChangePercentage}
                onChange={e => setOilChangePercentage(parseInt(e.target.value) || 0)}
                className="w-full h-1.5 bg-[#1E1E24] rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
              
              <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                <span>-50% (Mínimo)</span>
                <span>0% (Actual)</span>
                <span>+50% (Subida)</span>
                <span>+100% (Crisis)</span>
                <span>+150% (Extremo)</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Escenarios Predefinidos de Mercado:</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button" 
                  onClick={() => setOilChangePercentage(-40)}
                  className={`p-2 rounded text-left border text-xs font-sans transition flex flex-col justify-between cursor-pointer ${oilChangePercentage === -40 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-900 text-gray-300'}`}
                >
                  <span className="font-bold text-[10px]">🚢 Superávit Global</span>
                  <span className="text-[9px] text-gray-500">-40% en crude price</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setOilChangePercentage(0)}
                  className={`p-2 rounded text-left border text-xs font-sans transition flex flex-col justify-between cursor-pointer ${oilChangePercentage === 0 ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-900 text-gray-300'}`}
                >
                  <span className="font-bold text-[10px]">⚙️ Línea de Base</span>
                  <span className="text-[9px] text-gray-500">Tarifa pactada SCM</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setOilChangePercentage(50)}
                  className={`p-2 rounded text-left border text-xs font-sans transition flex flex-col justify-between cursor-pointer ${oilChangePercentage === 50 ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-900 text-gray-300'}`}
                >
                  <span className="font-bold text-[10px]">📈 Inestabilidad</span>
                  <span className="text-[9px] text-gray-500">+50% incremento BAF</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setOilChangePercentage(100)}
                  className={`p-2 rounded text-left border text-xs font-sans transition flex flex-col justify-between cursor-pointer ${oilChangePercentage === 100 ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-900 text-gray-300'}`}
                >
                  <span className="font-bold text-[10px]">🚨 Crisis Geopolítica</span>
                  <span className="text-[9px] text-gray-500">+100% (Recargos Peak)</span>
                </button>
              </div>
            </div>
            
            {/* Quick Summary metrics */}
            <div className="p-3.5 bg-[#0A0A0B] rounded-lg border border-gray-800 space-y-2.5">
              <div className="flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 font-mono">Sensibilidad de Bunker (BAF)</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                El recargo BAF compensa la fluctuación del combustible. 
                {oilChangePercentage > 0 ? (
                  <span> Un aumento simulado del <strong className="text-red-400 font-mono">+{oilChangePercentage}%</strong> en crudo elevará de forma proporcional el recargo contratado, incrementando el flete total de furgón.</span>
                ) : oilChangePercentage < 0 ? (
                  <span> Una caída del <strong className="text-emerald-400 font-mono">{oilChangePercentage}%</strong> reduce el BAF de convenio, abriendo oportunidades para maximizar márgenes de transporte.</span>
                ) : (
                  <span> Con precio estable al 100%, se aplica estrictamente el valor del recargo pactado en el contrato comercial de transporte.</span>
                )}
              </p>
            </div>
          </div>

          {/* Results Comparison Table/Bars (7 Cols) */}
          <div className="lg:col-span-12 xl:col-span-7 bg-[#0A0A0B] p-5 rounded-lg border border-gray-800 flex flex-col justify-between space-y-4">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block border-b border-gray-800/80 pb-2">
              Análisis Comparativo por Contenedor (Primeros 5 Contratos Filtrados)
            </span>
            
            <div className="space-y-3 max-h-68 overflow-y-auto pr-1">
              {filteredRates.slice(0, 5).map(rate => {
                const originalTotal = rate.baseRate + rate.bafSurcharge;
                const simBaf = rate.bafSurcharge * (1 + oilChangePercentage / 100);
                const simTotal = rate.baseRate + simBaf;
                const totalDiffPercent = ((simTotal - originalTotal) / originalTotal) * 100;
                
                return (
                  <div key={rate.id} className="p-3 bg-gray-950/60 rounded-lg border border-gray-850 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] bg-blue-950/30 border border-blue-900/30 px-1.5 py-0.5 rounded text-blue-400 font-bold">{rate.carrier.substring(0,3).toUpperCase()}</span>
                        <span className="font-bold text-white text-xs">{rate.carrier}</span>
                        <span className="text-[10px] text-gray-500 font-mono">({rate.pol} ✈ {rate.pod})</span>
                      </div>
                      <span className={`font-mono text-[11px] font-black ${totalDiffPercent === 0 ? 'text-gray-400' : totalDiffPercent > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {totalDiffPercent === 0 ? '0.0%' : totalDiffPercent > 0 ? `+${totalDiffPercent.toFixed(1)}%` : `${totalDiffPercent.toFixed(1)}%`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10.5px] border-t border-b border-gray-800/50 py-2 my-1">
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Flete Base</span>
                        <span className="font-mono font-bold text-gray-300">{renderRateValue(rate.baseRate, rate.currency)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase">BAF Original</span>
                        <span className="font-mono text-gray-400 block font-semibold">+{renderRateValue(rate.bafSurcharge, rate.currency)}</span>
                      </div>
                      <div>
                        <span className="text-amber-500 block text-[9px] uppercase font-bold">BAF Simulado</span>
                        <span className="font-mono font-black text-amber-400 block">+{renderRateValue(simBaf, rate.currency)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">Total Simulado</span>
                        <span className="font-mono font-black text-white text-xs block">{renderRateValue(simTotal, rate.currency)}</span>
                      </div>
                    </div>

                    {/* Progress Bar of Fuel Proportion */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-gray-500">
                        <span>BAF proporción del flete: <strong>{((simBaf / simTotal) * 100).toFixed(0)}%</strong></span>
                        <span>Original: {((rate.bafSurcharge / originalTotal) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-[#16161A] rounded-full h-1.5 overflow-hidden flex border border-gray-800">
                        <div 
                          style={{ width: `${(rate.baseRate / simTotal) * 100}%` }} 
                          className="bg-blue-600 h-full transition-all duration-300"
                        />
                        <div 
                          style={{ width: `${(simBaf / simTotal) * 100}%` }} 
                          className="bg-amber-500 h-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredRates.length === 0 && (
                <div className="text-center p-8 text-gray-500 italic text-xs">
                  No hay contratos activos para simular. Ajuste los filtros de búsqueda.
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-gray-400 leading-relaxed p-2.5 bg-blue-500/5 rounded border border-blue-500/10 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Nota Comercial:</strong> Alzas simuladas de combustible inciden de forma asimétrica. Un operador con flete base menor pero con alto BAF proporcional perderá competitividad más rápido ante alzas severas de petróleo.
              </span>
            </div>
          </div>
        </div>

        {/* FINANCIAL RISK ANALYSIS & MITIGATION PROJECTION */}
        {(() => {
          const [polVal, podVal] = selectedHistoryRoute ? selectedHistoryRoute.split(' → ') : ['', ''];
          const routeRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
          const activeRates = routeRates.length > 0 ? routeRates : rates;

          if (activeRates.length === 0) return null;

          const ratesWithSens = activeRates.map(rate => {
            const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10; // 0.6 to 1.0
            return { ...rate, elasticity: baseElasticity };
          });

          // Sort descendingly by elasticity to find high vs low sensitivity
          const sortedBySens = [...ratesWithSens].sort((a, b) => b.elasticity - a.elasticity);
          const highSensRateRaw = sortedBySens[0];
          const lowSensRateRaw = sortedBySens[sortedBySens.length - 1];

          let highSensRate = highSensRateRaw;
          let lowSensRate = lowSensRateRaw;

          // If same carrier (only 1 rate exists for the route), simulate a resilient carrier of -25% elasticity for comparison
          if (highSensRate && lowSensRate && highSensRate.id === lowSensRate.id) {
            lowSensRate = {
              ...highSensRate,
              id: 'sim-resilient-carrier',
              carrier: `${highSensRate.carrier} (GreenResilient Fleet)`,
              elasticity: Math.max(0.5, highSensRate.elasticity - 0.25),
              baseRate: highSensRate.baseRate,
              bafSurcharge: Math.round(highSensRate.bafSurcharge * 0.9)
            };
          }

          if (!highSensRate || !lowSensRate) return null;

          // Calculated based on the chosen display currency or default to original (USD fallback for standard calculation)
          const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' as CurrencyType : displayCurrency;
          const currSymbol = formatCurrencySymbol(targetCurr);

          // Rates with simulated fuel shock (slider)
          const simBafHigh = highSensRate.bafSurcharge * (1 + (oilChangePercentage / 100) * highSensRate.elasticity);
          const totalRateHigh = highSensRate.baseRate + simBafHigh;
          const totalRateHighConv = convertAmount(totalRateHigh, highSensRate.currency, targetCurr);
          const annualCostHigh = totalRateHighConv * bafSimulatedVolume;

          const simBafLow = lowSensRate.bafSurcharge * (1 + (oilChangePercentage / 100) * lowSensRate.elasticity);
          const totalRateLow = lowSensRate.baseRate + simBafLow;
          const totalRateLowConv = convertAmount(totalRateLow, lowSensRate.currency, targetCurr);
          const annualCostLow = totalRateLowConv * bafSimulatedVolume;

          const annualSavings = annualCostHigh - annualCostLow;
          const isSavingsPositive = annualSavings > 0;

          // Stress Tests
          // +50% shock
          const simBafHigh50 = highSensRate.bafSurcharge * (1 + 0.5 * highSensRate.elasticity);
          const totalRateHigh50 = highSensRate.baseRate + simBafHigh50;
          const annualCostHigh50 = convertAmount(totalRateHigh50, highSensRate.currency, targetCurr) * bafSimulatedVolume;

          const simBafLow50 = lowSensRate.bafSurcharge * (1 + 0.5 * lowSensRate.elasticity);
          const totalRateLow50 = lowSensRate.baseRate + simBafLow50;
          const annualCostLow50 = convertAmount(totalRateLow50, lowSensRate.currency, targetCurr) * bafSimulatedVolume;
          const savings50 = annualCostHigh50 - annualCostLow50;

          // +100% shock
          const simBafHigh100 = highSensRate.bafSurcharge * (1 + 1.0 * highSensRate.elasticity);
          const totalRateHigh100 = highSensRate.baseRate + simBafHigh100;
          const annualCostHigh100 = convertAmount(totalRateHigh100, highSensRate.currency, targetCurr) * bafSimulatedVolume;

          const simBafLow100 = lowSensRate.bafSurcharge * (1 + 1.0 * lowSensRate.elasticity);
          const totalRateLow100 = lowSensRate.baseRate + simBafLow100;
          const annualCostLow100 = convertAmount(totalRateLow100, lowSensRate.currency, targetCurr) * bafSimulatedVolume;
          const savings100 = annualCostHigh100 - annualCostLow100;

          const formatClean = (val: number) => {
            return `${currSymbol}${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${targetCurr}`;
          };

          const riskExposure = Math.abs(highSensRate.elasticity - lowSensRate.elasticity) > 0.15 
            ? (oilChangePercentage > 40 ? 'ALTO' : 'MINIMIZABLE') 
            : 'ESTABLE';

          return (
            <div className="border-t border-gray-800/80 pt-6 mt-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none font-sans">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    INFORME DE CONTROL DEL RIESGO DE CARBURANTE (OIL & BAF MITIGATION REPORT)
                  </span>
                  <h4 className="text-xs font-black text-gray-200 tracking-tight uppercase font-sans">
                    Proyección Financiera de Traspaso a Flota con Menor Elasticidad de Combustible
                  </h4>
                  <p className="text-[11px] text-gray-400 font-sans">
                    Proyecta el impacto financiero anual para la ruta <strong className="text-white font-mono">{selectedHistoryRoute || 'Filtrada'}</strong> con un flujo comercial estimado de <strong className="text-blue-400 font-mono">{bafSimulatedVolume} TEU/año</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">Exposición al Riesgo:</span>
                  <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${
                    riskExposure === 'ALTO' 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                      : riskExposure === 'MINIMIZABLE'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {riskExposure}
                  </span>
                </div>
              </div>

              {/* Main Comparative Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch font-sans">
                {/* Provider with high sensitivity */}
                <div className="lg:col-span-4 bg-[#09090C] border border-gray-800/60 hover:border-red-900/45 p-4 rounded-xl flex flex-col justify-between space-y-3 transition group">
                  <div className="space-y-1">
                    <span className="text-[9px] text-red-405 font-bold uppercase tracking-wider block">Alta Sensibilidad de Combustible</span>
                    <h5 className="text-xs font-extrabold text-white truncate">{highSensRate.carrier}</h5>
                    <div className="flex justify-between text-[10.5px] font-mono text-gray-400">
                      <span>Elasticidad combustible:</span>
                      <span className="text-rose-400 font-bold">{highSensRate.elasticity.toFixed(2)}x</span>
                    </div>
                  </div>

                  <div className="bg-red-950/5 p-2.5 rounded border border-red-950/20 space-y-1.5 font-sans">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400 text-[10.5px]">Costo flete sim:</span>
                      <span className="text-white font-bold">{renderRateValue(totalRateHigh, highSensRate.currency)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono pt-1.5 border-t border-gray-900">
                      <span className="text-gray-400 text-[10.5px]">Costo Anual Proyectado:</span>
                      <span className="text-rose-450 font-bold text-xs">{formatClean(annualCostHigh)}</span>
                    </div>
                  </div>
                </div>

                {/* Transition Pillar / Benefit Indicator */}
                <div className="lg:col-span-4 bg-[#0E0E12] border border-gray-800/80 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1">
                    <ShieldCheck className="w-8 h-8 text-emerald-500/5 rotate-12" />
                  </div>
                  
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-bounce">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Ajuste de Riesgo Anualizado</span>
                    <h5 className="text-sm font-black text-white font-mono leading-none tracking-tight">
                      {isSavingsPositive ? `-${formatClean(annualSavings)}` : formatClean(annualSavings)}
                    </h5>
                    <span className="text-[9.5px] text-gray-500 block">Diferencial de cartera estimado</span>
                  </div>

                  <div className="w-full text-[10.5px] bg-[#09090C] border border-gray-850 px-3 py-1.5 rounded-lg text-emerald-300 font-medium leading-relaxed">
                    Menor volatilidad mensual en recargos FCL combinados de furgón.
                  </div>
                </div>

                {/* Provider with lower sensitivity */}
                <div className="lg:col-span-4 bg-[#09090C] border border-gray-800/60 hover:border-emerald-900/45 p-4 rounded-xl flex flex-col justify-between space-y-3 transition group">
                  <div className="space-y-1">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Baja Sensibilidad (Resiliente)</span>
                    <h5 className="text-xs font-extrabold text-white truncate">{lowSensRate.carrier}</h5>
                    <div className="flex justify-between text-[10.5px] font-mono text-gray-400">
                      <span>Elasticidad combustible:</span>
                      <span className="text-emerald-400 font-bold">{lowSensRate.elasticity.toFixed(2)}x</span>
                    </div>
                  </div>

                  <div className="bg-emerald-950/5 p-2.5 rounded border border-emerald-950/20 space-y-1.5 font-sans">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400 text-[10.5px]">Costo flete sim:</span>
                      <span className="text-white font-bold">{renderRateValue(totalRateLow, lowSensRate.currency)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono pt-1.5 border-t border-gray-900">
                      <span className="text-gray-400 text-[10.5px]">Costo Anual Proyectado:</span>
                      <span className="text-emerald-400 font-medium text-xs">{formatClean(annualCostLow)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stress testing crude oil scenario breakdown */}
              <div className="space-y-2 font-sans">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Matriz de Stress-Testing: Mitigación de Pérdidas ante Escenarios de Alza Severa del Petróleo
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#121216]/50 border border-gray-800 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Alza moderada (+20%)</span>
                      <span className="text-[9px] text-gray-500 font-mono">Stress normal de mercado</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-emerald-400 text-xs block">
                        -{formatClean(annualSavings * 0.4)}
                      </span>
                      <span className="text-[9px] text-gray-500 block font-sans">Ahorro anual</span>
                    </div>
                  </div>

                  <div className="bg-[#121216]/50 border border-gray-800 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold uppercase block font-sans">Brent Shock (+50%)</span>
                      <span className="text-[9px] text-gray-500 font-mono">Ajuste geopolítico medio</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-emerald-400 text-xs block">
                        -{formatClean(savings50)}
                      </span>
                      <span className="text-[9px] text-gray-500 block font-sans">Ahorro mitigado</span>
                    </div>
                  </div>

                  <div className="bg-[#121216]/50 border border-gray-800 p-3 rounded-xl flex items-center justify-between text-yellow-50">
                    <div>
                      <span className="text-[10px] text-red-400 font-bold uppercase block font-sans">Crisis de Suministro (+100%)</span>
                      <span className="text-[9px] text-gray-500 font-mono">Doble recargo en furgón</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-emerald-400 text-xs block">
                        -{formatClean(savings100)}
                      </span>
                      <span className="text-[9px] text-gray-500 block font-sans">Retorno de cobertura</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive logistics advice */}
              <div className="p-3.5 bg-[#09090C] border border-gray-800 rounded-xl text-[11px] leading-relaxed text-gray-300 flex items-start gap-2.5 font-sans">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Recomendación Logística del Consultor:</strong> Existe una diferencia sustancial en la fórmula BAF de los operadores de la ruta. Mientras que <strong>{highSensRate.carrier}</strong> reacciona con un factor de elasticidad alto de <strong className="text-red-400 font-mono">{highSensRate.elasticity.toFixed(2)}x</strong>, la flota de <strong>{lowSensRate.carrier}</strong> absorbe parcialmente los saltos de crudo con un factor de <strong className="text-emerald-400 font-mono">{lowSensRate.elasticity.toFixed(2)}x</strong>. Ante un escenario de inestabilidad, la migración sistemática de cupos hacia la naviera resiliente evitaría sobrecostos imprevistos de flete anuales por valor de hasta <strong className="text-emerald-400 font-mono">{formatClean(savings100)}</strong> en momentos críticos.
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Side-by-side fuel-stability evaluation section */}
      <div id="fuel-stability-comparison" className="bg-[#111114] border border-gray-800 rounded-xl p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800/60 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Comparativa Lado a Lado: Resiliencia y Estabilidad Tarifaria (+20%)
            </h3>
            <p className="text-[11px] text-gray-400 font-sans">
              Analice lado a lado la estabilidad de cada naviera ante un alza de crudo en la ruta activa y seleccione el proveedor con menor exposición al riesgo de recargas.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#0A0A0B] px-3.5 py-1.5 rounded-lg border border-gray-800 shrink-0">
            <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">Simulación de Alza de Crudo:</span>
            <div className="flex items-center gap-1 font-sans">
              <button 
                type="button"
                onClick={() => setCmpOilPricePercentage(10)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition ${cmpOilPricePercentage === 10 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#121216] text-gray-400 hover:text-white border border-transparent'}`}
              >
                +10%
              </button>
              <button 
                type="button"
                onClick={() => setCmpOilPricePercentage(20)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition ${cmpOilPricePercentage === 20 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black ring-1 ring-amber-500/10' : 'bg-[#121216] text-gray-400 hover:text-white border border-transparent'}`}
                title="Incremento estándar solicitado"
              >
                +20% (Std)
              </button>
              <button 
                type="button"
                onClick={() => setCmpOilPricePercentage(50)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition ${cmpOilPricePercentage === 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#121216] text-gray-400 hover:text-white border border-transparent'}`}
              >
                +50%
              </button>
              <button 
                type="button"
                onClick={() => setCmpOilPricePercentage(100)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition ${cmpOilPricePercentage === 100 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#121216] text-gray-400 hover:text-white border border-transparent'}`}
              >
                +100%
              </button>
            </div>
          </div>
        </div>

        {/* Info & Slider Block */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#09090B] p-4 rounded-lg border border-gray-800/80">
          <div className="md:col-span-5 space-y-0.5 font-sans">
            <span className="text-[11px] text-gray-300 font-bold block">Ajuste de fluctuación de fuel evaluado:</span>
            <span className="text-[10px] text-gray-500 block">Cambie la escala de fluctuación para ver la asimetría de costes.</span>
          </div>
          <div className="md:col-span-4 flex items-center gap-3">
            <input 
              type="range"
              min="0"
              max="150"
              step="5"
              value={cmpOilPricePercentage}
              onChange={e => setCmpOilPricePercentage(parseInt(e.target.value) || 20)}
              className="w-full h-1 bg-amber-500/40 rounded appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 whitespace-nowrap shrink-0">
              +{cmpOilPricePercentage}% Fuel
            </span>
          </div>
          <div className="md:col-span-3 text-right">
            <span className="text-[10px] text-blue-400 font-bold uppercase font-mono tracking-wider">
              Ruta en Análisis: {selectedHistoryRoute || 'N/A'}
            </span>
          </div>
        </div>

        {/* Side-by-side cards */}
        {(() => {
          if (!selectedHistoryRoute) return null;
          const [polVal, podVal] = selectedHistoryRoute.split(' → ');
          const routeRates = rates.filter(r => r.pol === polVal && r.pod === podVal);

          if (routeRates.length === 0) {
            return (
              <div className="p-8 text-center bg-[#0A0A0B]/60 rounded-xl border border-gray-800 italic text-gray-400 text-xs">
                No hay operadores registrados para simular la ruta activa. Registre una tarifa en la parte superior para habilitar el análisis de estabilidad.
              </div>
            );
          }

          // Calculate stable rates
          let leastIncreaseRateId: string | null = null;
          let leastIncreasePercentage = Infinity;

          routeRates.forEach(rate => {
            const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
            const simBaf = rate.bafSurcharge * (1 + (cmpOilPricePercentage / 100) * baseElasticity);
            const originalTotal = rate.baseRate + rate.bafSurcharge;
            const simTotal = rate.baseRate + simBaf;
            const totalIncreasePercent = ((simTotal - originalTotal) / originalTotal) * 100;
            if (totalIncreasePercent < leastIncreasePercentage) {
              leastIncreasePercentage = totalIncreasePercent;
              leastIncreaseRateId = rate.id;
            }
          });

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {routeRates.map(rate => {
                  const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
                  const simBaf = rate.bafSurcharge * (1 + (cmpOilPricePercentage / 100) * baseElasticity);
                  
                  const targetCurr = displayCurrency === 'ORIGINAL' ? rate.currency : displayCurrency;
                  const symbol = formatCurrencySymbol(targetCurr);

                  const baseConv = convertAmount(rate.baseRate, rate.currency, targetCurr);
                  const bafConv = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
                  const simBafConv = convertAmount(simBaf, rate.currency, targetCurr);

                  const originalTotal = baseConv + bafConv;
                  const simulatedTotal = baseConv + simBafConv;
                  const totalIncrease = simulatedTotal - originalTotal;
                  const totalIncreasePercent = ((simulatedTotal - originalTotal) / originalTotal) * 100;

                  const isMostStable = rate.id === leastIncreaseRateId;
                  const isSelected = selectedStableCarrierId === rate.id;

                  // Let's compute a stability rating scale (1 to 5)
                  const score = Math.max(1, Math.min(5, Math.ceil(5 - (totalIncreasePercent / 12))));

                  return (
                    <div 
                      key={rate.id}
                      onClick={() => setSelectedStableCarrierId(isSelected ? null : rate.id)}
                      className={`relative rounded-xl p-5 border text-left cursor-pointer select-none transition-all duration-300 flex flex-col justify-between h-auto gap-4 ${
                        isSelected 
                          ? 'bg-[#182a20]/45 border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_4px_25px_rgba(16,185,129,0.1)]' 
                          : isMostStable
                          ? 'bg-[#15151b] border-blue-500/40 hover:border-blue-500/60 shadow-md'
                          : 'bg-[#131317] border-gray-800 hover:border-gray-700 hover:bg-[#16161c]'
                      }`}
                    >
                      {/* Recommendation & Selection Badges */}
                      <div className="absolute top-3.5 right-3.5 flex items-center gap-1 font-sans">
                        {isMostStable && (
                          <span className="text-[8.5px] uppercase font-mono font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded tracking-wide">
                            Más Estable
                          </span>
                        )}
                        {isSelected && (
                          <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border border-black shadow">
                            <Check className="w-3.5 h-3.5 text-black font-black" />
                          </span>
                        )}
                      </div>

                      {/* Header info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1 px-1.5 rounded text-[10px] bg-gray-950 text-blue-400 font-bold border border-gray-800 font-mono tracking-wider">
                            {rate.carrier.substring(0,3).toUpperCase()}
                          </span>
                          <h4 className="font-bold text-gray-100 text-sm">{rate.carrier}</h4>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold font-mono">
                          Id de Tarifa: {rate.id} • {rate.equipment} • {rate.transitTimeDays} d. tránsito
                        </p>
                      </div>

                      {/* Comparison Columns */}
                      <div className="bg-[#0A0A0B]/80 rounded-lg border border-gray-850 p-2.5 space-y-2 mt-1">
                        <div className="flex justify-between text-[11px] text-gray-400 border-b border-gray-850/40 pb-1.5 font-sans">
                          <span>Tarifa Estándar Base:</span>
                          <span className="font-mono text-gray-200 font-medium">
                            {symbol}{originalTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {targetCurr}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 font-sans">
                          <span>Surgimiento de BAF hoy:</span>
                          <span className="font-mono text-gray-400 block">
                            +{symbol}{bafConv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-amber-500/80 font-sans">
                          <span>BAF Simulado ({cmpOilPricePercentage}%):</span>
                          <span className="font-mono text-amber-400 font-bold block">
                            +{symbol}{simBafConv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-white border-t border-gray-850/60 pt-1.5 font-bold font-sans">
                          <span>Total Estimado:</span>
                          <span className="font-mono text-white">
                            {symbol}{simulatedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {targetCurr}
                          </span>
                        </div>
                      </div>

                      {/* Stability scoring */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                          <span>Impacto incremento:</span>
                          <span className="text-red-400 font-bold">
                            +{symbol}{totalIncrease.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({totalIncreasePercent.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden flex border border-gray-900">
                          <div 
                            style={{ width: `${Math.max(10, 100 - (totalIncreasePercent * 3))}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${isMostStable ? 'bg-blue-500' : 'bg-amber-500'}`}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                          <span>Sensibilidad: {(baseElasticity * 100).toFixed(0)}%</span>
                          <span className="font-bold text-gray-400">Estabilidad: {score}/5</span>
                        </div>
                      </div>

                      {/* Action selector */}
                      <div className="pt-1.5 font-sans">
                        <button 
                          type="button"
                          className={`w-full py-2 rounded text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-500 text-black border border-emerald-600 active:scale-95' 
                              : 'bg-[#1e1e24] text-gray-300 hover:text-white border border-gray-850 hover:bg-[#25252d] active:scale-95'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              Socio Seleccionado para Operación
                            </>
                          ) : (
                            "Fijar Naviera como Preferida"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feedback messages */}
              {selectedStableCarrierId && (() => {
                const selectedRate = rates.find(r => r.id === selectedStableCarrierId);
                if (!selectedRate) return null;
                const carrierSeed = selectedRate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const baseElasticity = 0.8 + ((carrierSeed % 5) - 2) / 10;
                const simBaf = selectedRate.bafSurcharge * (1 + (cmpOilPricePercentage / 100) * baseElasticity);
                const totalSim = selectedRate.baseRate + simBaf;

                const targetCurr = displayCurrency === 'ORIGINAL' ? selectedRate.currency : displayCurrency;
                const totalSimConv = convertAmount(totalSim, selectedRate.currency, targetCurr);
                const symbol = formatCurrencySymbol(targetCurr);

                return (
                  <div className="p-3.5 bg-emerald-500/10 text-emerald-400 font-sans text-xs rounded-lg border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Se ha seleccionado <strong className="text-white">{selectedRate.carrier}</strong> para la ruta <strong className="text-white">{selectedHistoryRoute}</strong>. 
                        Es la decisión recomendada de flete marítimo resiliente para mitigar las fluctuaciones en fuel.
                      </span>
                    </div>
                    <div className="text-right font-mono text-[11px] shrink-0 font-bold bg-[#0A0A0B]/40 px-2.5 py-1 rounded border border-emerald-500/10">
                      Total Estimado: <span className="text-white">{symbol}{totalSimConv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {targetCurr}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>

      {/* NEW SECTION: Side-by-side Carrier Route Cost Comparison */}
      <div id="carrier-routes-comparison" className="bg-[#111114] border border-gray-800 rounded-xl p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800/60 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              Comparativa de Costo Base de Fletes (Doble Ruta / Misma Naviera)
            </h3>
            <p className="text-[11px] text-gray-400 font-sans">
              Compare de forma simultánea el costo base, recargos y tiempos de tránsito de una misma naviera operando en dos corredores (POL/POD) distintos.
            </p>
          </div>
        </div>

        {/* Control Panel: Carrier and Route dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#09090B] p-4 rounded-lg border border-gray-800/80">
          {/* Select Carrier */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">1. Naviera en Evaluación</span>
            <select
              value={selectedCarrierForRouteCmp}
              onChange={e => handleCarrierChange(e.target.value)}
              className="bg-[#111114] border border-gray-800 rounded px-3 py-2 text-xs text-white font-semibold cursor-pointer focus:border-blue-500 focus:outline-none"
            >
              <option value="" disabled>Seleccione Naviera...</option>
              {Array.from(new Set(rates.map(r => r.carrier))).map(carrier => (
                <option key={carrier} value={carrier}>
                  🚢 {carrier}
                </option>
              ))}
            </select>
          </div>

          {/* Select Route A */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">2. Corredor A</span>
            <select
              value={selectedRouteA}
              onChange={e => setSelectedRouteA(e.target.value)}
              className="bg-[#111114] border border-gray-800 rounded px-3 py-2 text-xs text-white font-semibold cursor-pointer focus:border-blue-500 focus:outline-none"
              disabled={!selectedCarrierForRouteCmp}
            >
              <option value="" disabled>Seleccione Ruta A...</option>
              {Array.from(new Set(rates.filter(r => r.carrier === selectedCarrierForRouteCmp).map(r => `${r.pol} → ${r.pod}`))).map(route => (
                <option key={`a-${route}`} value={route}>
                  📍 {route}
                </option>
              ))}
            </select>
          </div>

          {/* Select Route B */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">3. Corredor B (Doble Comparación)</span>
            <select
              value={selectedRouteB}
              onChange={e => setSelectedRouteB(e.target.value)}
              className="bg-[#111114] border border-gray-800 rounded px-3 py-2 text-xs text-white font-semibold cursor-pointer focus:border-blue-500 focus:outline-none"
              disabled={!selectedCarrierForRouteCmp}
            >
              <option value="" disabled>Seleccione Ruta B...</option>
              {Array.from(new Set(rates.filter(r => r.carrier === selectedCarrierForRouteCmp).map(r => `${r.pol} → ${r.pod}`))).map(route => (
                <option key={`b-${route}`} value={route}>
                  📍 {route}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side Dual Route Display content */}
        {(() => {
          if (!selectedCarrierForRouteCmp) {
            return (
              <div className="p-8 text-center bg-[#0A0A0B]/60 rounded-xl border border-gray-800 italic text-gray-400 text-xs font-sans">
                Por favor, seleccione un operador para habilitar el selector de rutas comparativo.
              </div>
            );
          }

          const rateObjA = rates.find(r => r.carrier === selectedCarrierForRouteCmp && `${r.pol} → ${r.pod}` === selectedRouteA);
          const rateObjB = rates.find(r => r.carrier === selectedCarrierForRouteCmp && `${r.pol} → ${r.pod}` === selectedRouteB);

          if (!rateObjA && !rateObjB) {
            return (
              <div className="p-8 text-center bg-[#0A0A0B]/60 rounded-xl border border-gray-800 italic text-gray-400 text-xs font-sans">
                No se encontraron tarifas para las rutas especificadas.
              </div>
            );
          }

          // Compute converted prices
          const getDetails = (rate?: ContractRate) => {
            if (!rate) return { base: 0, baf: 0, total: 0, curr: 'USD' as CurrencyType };
            const targetCurr = displayCurrency === 'ORIGINAL' ? rate.currency : displayCurrency;
            const convBase = convertAmount(rate.baseRate, rate.currency, targetCurr);
            const convBaf = convertAmount(rate.bafSurcharge, rate.currency, targetCurr);
            return {
              base: convBase,
              baf: convBaf,
              total: convBase + convBaf,
              curr: targetCurr
            };
          };

          const detailsA = getDetails(rateObjA);
          const detailsB = getDetails(rateObjB);

          const symA = formatCurrencySymbol(detailsA.curr);
          const symB = formatCurrencySymbol(detailsB.curr);

          // Calculate difference details if both rates exist
          let baseCostDelta = 0;
          let percentDelta = 0;
          let daysDelta = 0;
          let hasComparison = false;

          if (rateObjA && rateObjB) {
            hasComparison = true;
            // Bring to USD for comparison math
            const usdBaseA = convertAmount(rateObjA.baseRate, rateObjA.currency, 'USD');
            const usdBaseB = convertAmount(rateObjB.baseRate, rateObjB.currency, 'USD');
            const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' as CurrencyType : displayCurrency;
            
            const convertedBaseA = convertAmount(usdBaseA, 'USD', targetCurr);
            const convertedBaseB = convertAmount(usdBaseB, 'USD', targetCurr);
            
            baseCostDelta = convertedBaseA - convertedBaseB;
            if (convertedBaseB > 0) {
              percentDelta = (baseCostDelta / convertedBaseB) * 100;
            } else if (convertedBaseA > 0) {
              percentDelta = 100;
            }
            daysDelta = rateObjA.transitTimeDays - rateObjB.transitTimeDays;
          }

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Corridor A */}
                <div className={`p-5 rounded-xl border transition-all duration-300 ${rateObjA ? 'bg-[#0E131F]/30 border-blue-500/20' : 'bg-[#141419]/40 border-gray-800/40 pattern-grayscale'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase font-mono tracking-wider">
                      📍 Corredor A
                    </span>
                    {rateObjA && (
                      <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                        Mesa {rateObjA.mode} • {rateObjA.equipment}
                      </span>
                    )}
                  </div>

                  {rateObjA ? (
                    <div className="space-y-4">
                      {/* Route Ports Big */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white tracking-wide">{rateObjA.pol}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Puerto Origen</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white tracking-wide">{rateObjA.pod}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Destino final</span>
                        </div>
                      </div>

                      {/* Financial Detail Box */}
                      <div className="bg-black/40 rounded-lg p-3.5 border border-gray-850 space-y-2 mt-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-gray-400 font-sans">Flete Base:</span>
                          <span className="text-xl font-mono font-black text-blue-400">
                            {symA}{detailsA.base.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-medium font-sans">{detailsA.curr}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1.5 border-t border-gray-850/60 font-sans">
                          <span>Recargo BAF Fuel:</span>
                          <span className="font-mono text-gray-300">
                            +{symA}{detailsA.baf.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400 pt-1 border-t border-gray-850/40 font-bold font-sans">
                          <span>Costo Total Inicial:</span>
                          <span className="font-mono text-white">
                            {symA}{detailsA.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {detailsA.curr}
                          </span>
                        </div>
                      </div>

                      {/* Operational Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-center pt-1 font-sans">
                        <div className="bg-[#0A0A0D]/90 p-2 rounded border border-gray-850 flex flex-col justify-center">
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider">Tiempo de Tránsito</span>
                          <span className="text-sm font-bold text-gray-200 mt-1">{rateObjA.transitTimeDays} días</span>
                        </div>
                        <div className="bg-[#0A0A0D]/90 p-2 rounded border border-gray-850 flex flex-col justify-center">
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider">Asignación TEUS</span>
                          <span className="text-sm font-bold text-gray-200 mt-1">{rateObjA.allocationsTeu > 0 ? `${rateObjA.allocationsTeu} TEU` : 'Sin Límite'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-14 text-center text-gray-500 italic text-xs font-sans">
                      Seleccione una opción de ruta para rellenar el Corredor A
                    </div>
                  )}
                </div>

                {/* Card Corridor B */}
                <div className={`p-5 rounded-xl border transition-all duration-300 ${rateObjB ? 'bg-[#150F1A]/30 border-purple-500/20' : 'bg-[#141419]/40 border-gray-800/40 pattern-grayscale'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-black uppercase font-mono tracking-wider">
                      📍 Corredor B
                    </span>
                    {rateObjB && (
                      <span className="text-[10px] font-mono font-semibold text-gray-500 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                        Mesa {rateObjB.mode} • {rateObjB.equipment}
                      </span>
                    )}
                  </div>

                  {rateObjB ? (
                    <div className="space-y-4">
                      {/* Route Ports Big */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white tracking-wide">{rateObjB.pol}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Puerto Origen</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-400" />
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white tracking-wide">{rateObjB.pod}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Destino final</span>
                        </div>
                      </div>

                      {/* Financial Detail Box */}
                      <div className="bg-black/40 rounded-lg p-3.5 border border-gray-850 space-y-2 mt-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-gray-400 font-sans">Flete Base:</span>
                          <span className="text-xl font-mono font-black text-purple-400">
                            {symB}{detailsB.base.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-medium font-sans">{detailsB.curr}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1.5 border-t border-gray-850/60 font-sans">
                          <span>Recargo BAF Fuel:</span>
                          <span className="font-mono text-gray-300">
                            +{symB}{detailsB.baf.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400 pt-1 border-t border-gray-850/40 font-bold font-sans">
                          <span>Costo Total Inicial:</span>
                          <span className="font-mono text-white">
                            {symB}{detailsB.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {detailsB.curr}
                          </span>
                        </div>
                      </div>

                      {/* Operational Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-center pt-1 font-sans">
                        <div className="bg-[#0A0A0D]/90 p-2 rounded border border-gray-850 flex flex-col justify-center">
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider">Tiempo de Tránsito</span>
                          <span className="text-sm font-bold text-gray-200 mt-1">{rateObjB.transitTimeDays} días</span>
                        </div>
                        <div className="bg-[#0A0A0D]/90 p-2 rounded border border-gray-850 flex flex-col justify-center">
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider">Asignación TEUS</span>
                          <span className="text-sm font-bold text-gray-200 mt-1">{rateObjB.allocationsTeu > 0 ? `${rateObjB.allocationsTeu} TEU` : 'Sin Límite'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-14 text-center text-gray-500 italic text-xs font-sans">
                      Seleccione una opción de ruta para rellenar el Corredor B
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Comparison Delta Summary HUD */}
              {hasComparison && (
                <div className="bg-[#08080C] border border-gray-850/80 rounded-xl p-5 space-y-4 font-sans max-w-full overflow-hidden">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-gray-850/40">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Métricas Diferenciales Directas ({selectedCarrierForRouteCmp})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Cost compare result */}
                    <div className="bg-[#121217] p-3 rounded-lg border border-gray-850 flex flex-col justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Brecha Costo de Flete Fijo</span>
                      <div className="my-1.5 flex items-baseline gap-1.5">
                        <span className={`text-lg font-black font-mono ${baseCostDelta === 0 ? 'text-gray-400' : baseCostDelta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {baseCostDelta === 0 ? '' : baseCostDelta < 0 ? '-' : '+'}{formatCurrencySymbol(displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency)}{Math.abs(baseCostDelta).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${baseCostDelta === 0 ? 'bg-gray-850 text-gray-400' : baseCostDelta < 0 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                          {baseCostDelta === 0 ? '0%' : `${baseCostDelta < 0 ? '-' : '+'}${Math.abs(percentDelta).toFixed(1)}%`}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {baseCostDelta === 0 ? (
                          'Ambas rutas poseen exactamente el mismo flete base.'
                        ) : baseCostDelta < 0 ? (
                          <span>Corredor <strong>A</strong> es más económico que Corredor <strong>B</strong>.</span>
                        ) : (
                          <span>Corredor <strong>B</strong> es más económico que Corredor <strong>A</strong>.</span>
                        )}
                      </p>
                    </div>

                    {/* Transit compare result */}
                    <div className="bg-[#121217] p-3 rounded-lg border border-gray-850 flex flex-col justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Diferencial en Tránsito</span>
                      <div className="my-1.5 flex items-baseline gap-1.5">
                        <span className={`text-lg font-black font-mono ${daysDelta === 0 ? 'text-gray-400' : daysDelta < 0 ? 'text-emerald-400 animate-pulse' : 'text-amber-500'}`}>
                          {daysDelta === 0 ? 'Sin diferencia' : `${Math.abs(daysDelta)} días`}
                        </span>
                        <span className="text-[10.5px] text-gray-400 font-bold uppercase font-mono tracking-tighter col-span-1">
                          {daysDelta === 0 ? '' : daysDelta < 0 ? 'más rápido en A' : 'más rápido en B'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {daysDelta === 0 ? (
                          'Ambas rutas estiman exactamente el mismo plazo de tránsito marítimo.'
                        ) : daysDelta < 0 ? (
                          <span>El corredor <strong>A</strong> reduce la estancia marítima por <strong>{Math.abs(daysDelta)} días</strong>.</span>
                        ) : (
                          <span>El corredor <strong>B</strong> reduce la estancia marítima por <strong>{Math.abs(daysDelta)} días</strong>.</span>
                        )}
                      </p>
                    </div>

                    {/* Stability indicator relative to BAF ratios */}
                    <div className="bg-[#121217] p-3 rounded-lg border border-gray-850 flex flex-col justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Asimetría de Riesgo de Recargo</span>
                      {(() => {
                        const ratioA = rateObjA ? (rateObjA.bafSurcharge / rateObjA.baseRate) * 100 : 0;
                        const ratioB = rateObjB ? (rateObjB.bafSurcharge / rateObjB.baseRate) * 100 : 0;
                        const riskier = ratioA > ratioB ? 'Corredor A' : ratioB > ratioA ? 'Corredor B' : 'Igual riesgo';
                        return (
                          <>
                            <div className="my-1.5 flex items-baseline gap-1.5">
                              <span className="text-xs font-black text-gray-300 font-mono">
                                A: {ratioA.toFixed(0)}% BAF vs B: {ratioB.toFixed(0)}% BAF
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {ratioA === ratioB ? (
                                'Ambas rutas poseen idéntica sensibilidad proporcional a variaciones de fuel.'
                              ) : (
                                <span><strong>{riskier}</strong> tiene mayor proporción de BAF y sufrirá más impacto directo ante alzas repentinas de diésel.</span>
                              )}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Add New Rate Form Block */}
      {showAddForm && (
        <AddContractRateForm newRate={newRate} setNewRate={setNewRate} setShowAddForm={setShowAddForm} handleAddRate={handleAddRate} />
      )}

      {/* Filter panel */}
      <div className="bg-[#111114] border border-gray-800 p-5 rounded-xl space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
          <Filter className="w-4 h-4 mr-1.5 text-blue-500" /> Panel de Filtrado y Enrutamiento Internacional
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Origen (POL) - p.ej CNSHA"
              value={searchPol}
              onChange={e => setSearchPol(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Destino (POD) - p.ej ESBCN"
              value={searchPod}
              onChange={e => setSearchPod(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
          <div>
            <select 
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Modalidades</option>
              <option value="FCL">Ocean FCL</option>
              <option value="LCL">Ocean LCL</option>
              <option value="AIR">Air Cargo</option>
              <option value="ROAD">Terrestre FTL/LTL</option>
            </select>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Resultados: <strong className="text-white font-mono">{filteredRates.length}</strong></span>
            {displayCurrency !== 'ORIGINAL' && (
              <span className="text-[10px] text-amber-400">Convertido a {displayCurrency}</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid structure displaying the computed rates contracts */}
      <div className="bg-[#111114] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0A0A0B] text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                <th className="p-4">TRANSPORTISTA (CARRIER)</th>
                <th className="p-4">MODALIDAD / RUTA</th>
                <th className="p-4">TIPO EQUIPAMIENTO</th>
                <th className="p-4">DIVISA ORIGEN</th>
                <th className="p-4 text-right">TASA BASE NEGOCIADA</th>
                <th className="p-4 text-right">RECARGO COMB./BAF</th>
                <th className="p-4 text-right">TIEMPO TRÁNSITO</th>
                <th className="p-4">VALIDEZ HASTA</th>
                <th className="p-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {filteredRates.map((rate) => {
                const hasModifiedCalculation = displayCurrency !== 'ORIGINAL' && displayCurrency !== rate.currency;
                return (
                  <tr key={rate.id} className="hover:bg-gray-950/20 transition-colors">
                    <td className="p-4 flex items-center space-x-3">
                      <div className="p-1.5 bg-[#0A0A0B] border border-gray-800 rounded text-gray-400 font-bold font-mono">
                        {rate.carrier.substring(0,3).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{rate.carrier}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{rate.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-blue-400 font-bold bg-blue-950/20 px-1.5 py-0.5 rounded text-[10.5px]">
                          {rate.pol}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-600" />
                        <span className="font-mono text-emerald-450 font-bold bg-emerald-950/20 px-1.5 py-0.5 rounded text-[10.5px]">
                          {rate.pod}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-1">
                        {rate.mode === 'FCL' ? '🚢 Ocean FCL' : rate.mode === 'LCL' ? '📦 Ocean LCL' : rate.mode === 'AIR' ? '✈ Air Cargo' : '🚛 Land Transit'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-gray-300 font-bold border border-gray-850 px-2 py-0.5 rounded bg-[#16161A]">
                        {rate.equipment}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-amber-400 font-bold font-mono px-2 py-0.5 rounded bg-amber-500/5 border border-amber-500/10">
                        {rate.currency}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white text-sm">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{renderRateValue(rate.baseRate, rate.currency)}</span>
                        {(() => {
                          const carrierSeed = rate.carrier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                          const seedVariance = ((carrierSeed % 12) - 6) / 200;
                          const prevMultiplier = 0.97 - seedVariance;
                          const diffPercent = ((1.0 - prevMultiplier) / prevMultiplier) * 100;
                          
                          if (diffPercent > 0.01) {
                            return (
                              <span 
                                title={`Incremento mensual de flete: +${diffPercent.toFixed(1)}%`} 
                                className="inline-flex items-center text-[9.5px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 cursor-help"
                              >
                                <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" />
                                +{diffPercent.toFixed(1)}%
                              </span>
                            );
                          } else if (diffPercent < -0.01) {
                            return (
                              <span 
                                title={`Descuento mensual de flete: ${diffPercent.toFixed(1)}%`} 
                                className="inline-flex items-center text-[9.5px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 cursor-help"
                              >
                                <TrendingDown className="w-3 h-3 mr-0.5 shrink-0" />
                                {diffPercent.toFixed(1)}%
                              </span>
                            );
                          } else {
                            return (
                              <span 
                                title="Tarifa sin variación mensual" 
                                className="inline-flex items-center text-[9.5px] font-semibold text-gray-400 bg-gray-500/10 px-1.5 py-0.5 rounded border border-gray-500/20 cursor-help"
                              >
                                <Minus className="w-3 h-3 mr-0.5 shrink-0" />
                                0.0%
                              </span>
                            );
                          }
                        })()}
                      </div>
                      {hasModifiedCalculation && (
                        <div className="text-[9.5px] text-gray-500 font-normal line-through">
                          {formatCurrencySymbol(rate.currency)}{rate.baseRate.toLocaleString()} {rate.currency}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-400">
                      {oilChangePercentage === 0 ? (
                        <>
                          <div>+{renderRateValue(rate.bafSurcharge, rate.currency)}</div>
                          {hasModifiedCalculation && (
                            <div className="text-[9.5px] text-gray-500 font-normal line-through">
                              +{formatCurrencySymbol(rate.currency)}{rate.bafSurcharge} {rate.currency}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-0.5 text-right">
                          <div className="text-amber-400 font-bold flex items-center justify-end gap-1">
                            {oilChangePercentage > 0 ? (
                              <TrendingUp className="w-3 h-3 text-rose-450 text-red-400" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-emerald-450 text-emerald-400" />
                            )}
                            +{renderRateValue(rate.bafSurcharge * (1 + oilChangePercentage / 100), rate.currency)}
                          </div>
                          <div className="text-[10px] text-gray-500 line-through">
                            +{renderRateValue(rate.bafSurcharge, rate.currency)}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-white block font-mono">{rate.transitTimeDays} Días</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider">H.T. Tránsito</span>
                    </td>
                    <td className="p-4">
                      {(() => {
                        const status = getExpiryStatus(rate.validTo);
                        if (status.isExpired) {
                          return (
                            <div className="flex items-center space-x-2 text-red-400 font-sans" title="¡Tarifa de convenio Expirada!">
                              <div className="relative">
                                <Calendar className="w-4 h-4 text-red-500" />
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-black flex items-center justify-center">
                                  <span className="text-[7px] text-white font-black leading-none">!</span>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-mono text-xs line-through text-gray-500">{rate.validTo}</span>
                                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Expirado
                                </span>
                              </div>
                            </div>
                          );
                        } else if (status.isSoon) {
                          return (
                            <div className="flex items-center space-x-2 text-amber-500 font-sans" title={`Expira en ${status.daysLeft} días`}>
                              <div className="relative font-bold">
                                <Calendar className="w-4 h-4 text-amber-500" />
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-black flex items-center justify-center">
                                  <span className="text-[7px] text-black font-black leading-none">!</span>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-amber-400 font-bold">{rate.validTo}</span>
                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-0.5 animate-pulse">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500 font-bold" /> Expira en {status.daysLeft} d
                                </span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center space-x-1.5 text-gray-400 font-sans">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span className="font-mono text-xs text-gray-300">{rate.validTo}</span>
                            </div>
                          );
                        }
                      })()}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDeleteRate(rate.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition"
                        title="Eliminar convenio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRates.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-500 italic text-sm">
                    No se encontraron tarifas que coincidan con los criterios de búsqueda (FCL/LCL/AIR). Revise los filtros de POL/POD.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
