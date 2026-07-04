'use client';

import { useState, useMemo } from 'react';
import {
  Box, ShieldCheck, AlertTriangle,
  RotateCw, Truck, Layers
} from 'lucide-react';
import { ContainerScene, PackedItem } from './components/ContainerScene';

interface ContainerType {
  name: string;
  length: number; // meters
  width: number;
  height: number;
  maxWeight: number; // tons
  volume: number; // cubic meters
}

interface CargoType {
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number; // tons
  color: string;
}

interface ManifestItem {
  id: string;
  clientName: string;
  cargoIdx: number;
  quantity: number;
}

const CONTAINERS: ContainerType[] = [
  { name: '20ft Dry Van (Estándar)', length: 5.9, width: 2.35, height: 2.39, maxWeight: 28.0, volume: 33.2 },
  { name: '40ft Dry Van (Estándar)', length: 12.03, width: 2.35, height: 2.39, maxWeight: 26.5, volume: 67.7 }
];

const CARGO_ITEMS: CargoType[] = [
  { name: 'Palet Euro (1.2x0.8m)', length: 1.2, width: 0.8, height: 1.4, weight: 0.8, color: '#3b82f6' },
  { name: 'Palet Industrial (1.2x1.0m)', length: 1.2, width: 1.0, height: 1.4, weight: 1.0, color: '#f59e0b' },
  { name: 'Bobina de Papel Gigante', length: 1.2, width: 1.2, height: 1.5, weight: 1.6, color: '#10b981' },
  { name: 'Caja Carga Pesada (1.0x1.0m)', length: 1.0, width: 1.0, height: 1.0, weight: 2.0, color: '#ec4899' }
];

export function ContainerPlanner() {
  const [selectedContainer, setSelectedContainer] = useState<number>(0);
  const [allowDoubleStack, setAllowDoubleStack] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'side'>('3d');
  
  // LCL Consolidation Manifest (Hardcoded for Demo)
  const [manifest] = useState<ManifestItem[]>([
    { id: 'C-A', clientName: 'Cliente A (Tech)', cargoIdx: 0, quantity: 10 },
    { id: 'C-B', clientName: 'Cliente B (Industrial)', cargoIdx: 1, quantity: 5 },
    { id: 'C-C', clientName: 'Cliente C (Maquinaria)', cargoIdx: 3, quantity: 2 }
  ]);
  
  const container = CONTAINERS[selectedContainer];

  // 1. LCL Stuffing Optimization Algorithm
  // Packs items sequentially from the manifest, row-by-row, handling double stacking
  const packingResult = useMemo(() => {
    const packedItems: PackedItem[] = [];
    
    let currentX = 0.1; // offset from front wall
    let currentY = 0.1; // offset from left wall
    let rowMaxLength = 0;
    
    let totalWeight = 0;
    let itemsPacked = 0;
    
    const clientStats: Record<string, { total: number, packed: number }> = {};
    let totalQuantity = 0;

    manifest.forEach(m => {
      clientStats[m.id] = { total: m.quantity, packed: 0 };
      totalQuantity += m.quantity;
    });
    
    for (const m of manifest) {
      const cargo = CARGO_ITEMS[m.cargoIdx];
      
      for (let i = 0; i < m.quantity; i++) {
        // Check weight limit
        if (totalWeight + cargo.weight > container.maxWeight) {
          continue;
        }
        
        let zPos = 0;
        let isStacked = false;
        let underItem: PackedItem | undefined = undefined;
        
        if (allowDoubleStack && (cargo.height * 2 <= container.height)) {
          // Look if we can stack on top of a previously packed item
          underItem = packedItems.find(p => 
            p.z === 0 &&
            p.length >= cargo.length &&
            p.width >= cargo.width &&
            p.height + cargo.height <= container.height &&
            !packedItems.some(top => Math.abs(top.x - p.x) < 0.01 && Math.abs(top.y - p.y) < 0.01 && top.z > 0)
          );
          
          if (underItem) {
            zPos = underItem.height;
            isStacked = true;
          }
        }
        
        let placeX = currentX;
        let placeY = currentY;

        if (!isStacked) {
          if (packedItems.length > 0) {
            // Check if it fits in the current row
            if (currentY + cargo.width > container.width) {
              currentX += rowMaxLength; // move to next row based on largest item in row
              currentY = 0.1;
              rowMaxLength = 0;
              placeX = currentX;
              placeY = currentY;
            }
          }
          
          // Check if it exceeds container length
          if (currentX + cargo.length > container.length) {
            continue; // Won't fit, try next item
          }
        } else {
          placeX = underItem!.x;
          placeY = underItem!.y;
        }
        
        packedItems.push({
          id: `${m.id}-${i+1}`,
          clientId: m.id,
          clientName: m.clientName,
          color: cargo.color,
          x: placeX,
          y: placeY,
          z: zPos,
          length: cargo.length,
          width: cargo.width,
          height: cargo.height,
          weight: cargo.weight,
          isStacked
        });
        
        totalWeight += cargo.weight;
        itemsPacked++;
        clientStats[m.id].packed++;
        
        if (!isStacked) {
          currentY += cargo.width;
          rowMaxLength = Math.max(rowMaxLength, cargo.length);
        }
      }
    }
    
    // Calculations
    let packedVolume = 0;
    packedItems.forEach(item => {
      packedVolume += item.length * item.width * item.height;
    });
    
    const volUtilPercent = Math.min((packedVolume / container.volume) * 100, 100);
    const weightUtilPercent = (totalWeight / container.maxWeight) * 100;
    
    // Calculate center of gravity (X balance)
    let sumWeightedX = 0;
    packedItems.forEach(p => {
      sumWeightedX += (p.x + p.length/2) * p.weight;
    });
    const cogX = itemsPacked > 0 ? sumWeightedX / totalWeight : container.length / 2;
    const cogDeviationPercent = ((cogX - (container.length / 2)) / (container.length / 2)) * 100;

    return {
      items: packedItems,
      totalWeight,
      itemsPacked,
      totalQuantity,
      leftOut: totalQuantity - itemsPacked,
      clientStats,
      volUtilPercent,
      weightUtilPercent,
      cogX,
      cogDeviationPercent,
      isCenterHeavy: Math.abs(cogDeviationPercent) > 15
    };
  }, [container, manifest, allowDoubleStack]);

  return (
    <div className="container-planner-dashboard">
      
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2.5rem' }}>
        
        {/* 1. Sidebar Parameters Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: 0 }}>
          <div className="card-header" style={{ padding: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <h3>LCL Consolidation Engine</h3>
          </div>

          {/* Container Size Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              Especificación del Contenedor:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {CONTAINERS.map((c, idx) => (
                <button
                  key={idx}
                  className={`sheet-select-btn ${selectedContainer === idx ? 'active-container-btn' : ''}`}
                  style={{
                    padding: '0.75rem 1rem',
                    justifyContent: 'flex-start',
                    gap: '0.75rem',
                    background: selectedContainer === idx ? 'var(--accent-soft)' : 'var(--bg-tertiary)',
                    borderColor: selectedContainer === idx ? 'var(--accent)' : 'var(--border)',
                    color: selectedContainer === idx ? 'var(--accent)' : 'var(--text-primary)'
                  }}
                  onClick={() => setSelectedContainer(idx)}
                >
                  <Truck size={18} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.1rem' }}>
                    <strong>{c.name}</strong>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {c.length}m L x {c.width}m W x {c.height}m H • {c.maxWeight} Tons máx
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Consolidation Manifest */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                Manifiesto de Consolidación (LCL):
              </label>
              <Layers size={16} className="text-accent" />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {manifest.map((m) => {
                const cargo = CARGO_ITEMS[m.cargoIdx];
                const stats = packingResult.clientStats[m.id];
                const isFullyPacked = stats.packed === stats.total;
                
                return (
                  <div key={m.id} style={{
                    background: 'var(--bg-tertiary)',
                    border: `1px solid ${isFullyPacked ? 'var(--border)' : 'rgba(245, 158, 11, 0.5)'}`,
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: cargo.color }}>{m.clientName}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isFullyPacked ? 'var(--text-primary)' : '#f59e0b' }}>
                        {stats.packed} / {stats.total} estibados
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {cargo.name} ({cargo.weight}T/ud)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stacking Preference */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input 
              type="checkbox" 
              id="double-stack-check" 
              checked={allowDoubleStack}
              onChange={e => setAllowDoubleStack(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label htmlFor="double-stack-check" style={{ fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
              Permitir Apilado Doble (Double Stacking)
            </label>
          </div>

          {/* Optimization Alerts */}
          <div style={{ marginTop: '0.5rem' }}>
            {packingResult.leftOut > 0 ? (
              <div className="card-notes-panel" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.85rem', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertTriangle className="text-warning" size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#f59e0b' }}>
                  ¡Capacidad Excedida! {packingResult.leftOut} bultos quedaron fuera.
                </span>
              </div>
            ) : packingResult.weightUtilPercent > 90 ? (
              <div className="card-notes-panel" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.85rem', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertTriangle className="text-danger" size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ef4444' }}>
                  Peso límite crítico superado ({packingResult.weightUtilPercent.toFixed(0)}%).
                </span>
              </div>
            ) : (
              <div className="card-notes-panel" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.85rem', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <ShieldCheck className="text-success" size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#10b981' }}>
                  Distribución estable y segura verificada.
                </span>
              </div>
            )}
          </div>

        </div>

        {/* 2. Visual Canvas Frame */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header & Mode Toggles */}
          <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Box className="text-accent" />
                <h4 style={{ fontWeight: 'bold' }}>Simulador Tridimensional de Estiba LCL</h4>
              </div>
              <div className="tabs" style={{ padding: '0.2rem' }}>
                <button 
                  className={`tab-btn ${viewMode === '3d' ? 'active' : ''}`}
                  onClick={() => setViewMode('3d')}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  3D Isometric
                </button>
                <button 
                  className={`tab-btn ${viewMode === 'top' ? 'active' : ''}`}
                  onClick={() => setViewMode('top')}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  Planta (Top)
                </button>
                <button 
                  className={`tab-btn ${viewMode === 'side' ? 'active' : ''}`}
                  onClick={() => setViewMode('side')}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  Perfil (Side)
                </button>
              </div>
            </div>

            {/* Visual Canvas Element */}
            <div 
              className="canvas-container-frame"
              style={{
                width: '100%',
                height: '420px',
                background: 'var(--bg-tertiary)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                marginTop: '1rem',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <ContainerScene 
                  container={container} 
                  packedItems={packingResult.items} 
                  viewMode={viewMode} 
                />
              </div>
              
              <div 
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  pointerEvents: 'none'
                }}
              >
                <RotateCw size={12} />
                <span>Interactivo: Arrastra para rotar, Rueda para zoom</span>
              </div>
            </div>
          </div>

          {/* Volume and Weight Statistics Matrix */}
          <div className="report-kpi-grid">
            
            <div className="kpi-panel-card">
              <span className="kpi-label">Uso de Volumen</span>
              <h2 className="kpi-value text-accent">{packingResult.volUtilPercent.toFixed(1)}%</h2>
              <span className="kpi-detail">Volumen cargado vs total: {container.volume}m³</span>
            </div>

            <div className="kpi-panel-card">
              <span className="kpi-label">Uso de Peso</span>
              <h2 className="kpi-value text-success" style={{ color: packingResult.weightUtilPercent > 90 ? '#ef4444' : '#10b981' }}>
                {packingResult.weightUtilPercent.toFixed(1)}%
              </h2>
              <span className="kpi-detail">Peso cargado: {packingResult.totalWeight.toFixed(1)}T / {container.maxWeight}T</span>
            </div>

            <div className="kpi-panel-card">
              <span className="kpi-label">Artículos Estibados</span>
              <h2 className="kpi-value text-warning" style={{ color: '#f59e0b' }}>
                {packingResult.itemsPacked} / {packingResult.totalQuantity}
              </h2>
              <span className="kpi-detail">{packingResult.leftOut} bultos en cola de espera</span>
            </div>

            <div className="kpi-panel-card">
              <span className="kpi-label">Balance de Masa (COG)</span>
              <h2 className="kpi-value" style={{ color: packingResult.isCenterHeavy ? '#f59e0b' : '#10b981', fontSize: '1.5rem', lineHeight: '2.8rem' }}>
                {packingResult.isCenterHeavy ? 'Inclinado' : 'Estable'}
              </h2>
              <span className="kpi-detail">Desviación: {packingResult.cogDeviationPercent.toFixed(1)}% del centro</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
