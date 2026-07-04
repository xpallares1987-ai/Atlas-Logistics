'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, ShieldCheck, AlertTriangle,
  RotateCw, Truck
} from 'lucide-react';
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

interface PackedItem {
  id: string;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  isStacked: boolean;
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
  const [selectedCargo, setSelectedCargo] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(18);
  const [allowDoubleStack, setAllowDoubleStack] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'side'>('3d');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const container = CONTAINERS[selectedContainer];
  const cargo = CARGO_ITEMS[selectedCargo];

  // 1. Stuffing Optimization Algorithm
  // Packs items row-by-row, column-by-column, and handles double stacking
  const packingResult = useMemo(() => {
    const packedItems: PackedItem[] = [];
    const containerL = container.length;
    const containerW = container.width;
    const containerH = container.height;
    
    const itemL = cargo.length;
    const itemW = cargo.width;
    const itemH = cargo.height;
    
    let currentX = 0.1; // offset from front wall
    let currentY = 0.1; // offset from left wall
    
    let totalWeight = 0;
    let itemsPacked = 0;
    
    for (let i = 0; i < quantity; i++) {
      // Check weight limit
      if (totalWeight + cargo.weight > container.maxWeight) {
        break;
      }
      
      // Try to double stack if enabled
      let zPos = 0;
      let isStacked = false;
      let underItem: PackedItem | undefined = undefined;
      
      if (allowDoubleStack && (itemH * 2 <= containerH)) {
        // Look if we can stack on top of a previous item at currentX, currentY
        underItem = packedItems.find(p => 
          Math.abs(p.x - currentX) < 0.1 && 
          Math.abs(p.y - currentY) < 0.1 && 
          p.z === 0
        );
        
        if (underItem && !packedItems.some(p => Math.abs(p.x - currentX) < 0.1 && Math.abs(p.y - currentY) < 0.1 && p.z > 0)) {
          zPos = itemH;
          isStacked = true;
        }
      }
      
      if (!isStacked) {
        // If not double stacked, advance layout grid
        if (packedItems.length > 0) {
          currentY += itemW;
          // If we exceed container width, move to next row (lengthways)
          if (currentY + itemW > containerW) {
            currentY = 0.1;
            currentX += itemL;
          }
        }
        
        // If we exceed container length, container is full!
        if (currentX + itemL > containerL) {
          break;
        }
      }
      
      packedItems.push({
        id: `Item-${i+1}`,
        x: isStacked && underItem ? underItem.x : currentX,
        y: isStacked && underItem ? underItem.y : currentY,
        z: zPos,
        length: itemL,
        width: itemW,
        height: itemH,
        weight: cargo.weight,
        isStacked
      });
      
      totalWeight += cargo.weight;
      itemsPacked++;
    }
    
    // Calculations
    const singleVolume = itemL * itemW * itemH;
    const packedVolume = itemsPacked * singleVolume;
    const volUtilPercent = Math.min((packedVolume / container.volume) * 100, 100);
    const weightUtilPercent = (totalWeight / container.maxWeight) * 100;
    
    // Calculate center of gravity (X balance)
    let sumWeightedX = 0;
    packedItems.forEach(p => {
      sumWeightedX += (p.x + p.length/2) * p.weight;
    });
    const cogX = itemsPacked > 0 ? sumWeightedX / totalWeight : containerL / 2;
    const cogDeviationPercent = ((cogX - (containerL / 2)) / (containerL / 2)) * 100;

    return {
      items: packedItems,
      totalWeight,
      itemsPacked,
      leftOut: quantity - itemsPacked,
      volUtilPercent,
      weightUtilPercent,
      cogX,
      cogDeviationPercent,
      isCenterHeavy: Math.abs(cogDeviationPercent) > 15
    };
  }, [container, cargo, quantity, allowDoubleStack]);

  // 2a. Vista Superior (2D Top Down)
  const drawTopView = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const scale = container.length > 6 ? 45 : 90; // scale factor pixels/meter
    const offsetX = (w - (container.length * scale)) / 2;
    const offsetY = (h - (container.width * scale)) / 2;
    
    // Draw container boundary
    ctx.strokeStyle = 'var(--text-primary)';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, container.length * scale, container.width * scale);
    
    // Fill container interior background
    ctx.fillStyle = 'var(--bg-tertiary)';
    ctx.fillRect(offsetX, offsetY, container.length * scale, container.width * scale);
    
    // Grid lines every 1m
    ctx.strokeStyle = 'var(--border)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (let x = 1; x < container.length; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * scale, offsetY);
      ctx.lineTo(offsetX + x * scale, offsetY + container.width * scale);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    
    // Draw packed items (only top items visible, or outline stacked ones)
    packingResult.items.forEach(item => {
      ctx.fillStyle = cargo.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      
      const ix = offsetX + item.x * scale;
      const iy = offsetY + item.y * scale;
      const iw = item.length * scale;
      const ih = item.width * scale;
      
      ctx.fillRect(ix, iy, iw, ih);
      ctx.strokeRect(ix, iy, iw, ih);
      
      // If stacked, draw small overlay label
      if (item.z > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(ix + 2, iy + 2, iw - 4, ih - 4);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STK', ix + iw/2, iy + ih/2);
      }
    });

    // Label Front / Door
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FRENTE (FRONT)', offsetX - 50, offsetY + (container.width * scale) / 2);
    ctx.fillText('PUERTA (DOOR)', offsetX + container.length * scale + 50, offsetY + (container.width * scale) / 2);
  };

  // 2b. Vista Lateral (2D Side View)
  const drawSideView = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const scale = container.length > 6 ? 45 : 90;
    const offsetX = (w - (container.length * scale)) / 2;
    const offsetY = (h - (container.height * scale)) / 2;
    
    // Draw container boundary
    ctx.strokeStyle = 'var(--text-primary)';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, container.length * scale, container.height * scale);
    
    // Fill interior
    ctx.fillStyle = 'var(--bg-tertiary)';
    ctx.fillRect(offsetX, offsetY, container.length * scale, container.height * scale);
    
    // Draw packed items from the side profile
    packingResult.items.forEach(item => {
      ctx.fillStyle = cargo.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      
      const ix = offsetX + item.x * scale;
      // Invert Y coordinate for canvas (0,0 is top-left, but ground is bottom)
      const iy = offsetY + (container.height - item.z - item.height) * scale;
      const iw = item.length * scale;
      const ih = item.height * scale;
      
      ctx.fillRect(ix, iy, iw, ih);
      ctx.strokeRect(ix, iy, iw, ih);
    });

    // Labels
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUELO (GROUND)', w / 2, offsetY + container.height * scale + 25);
  };

  // 2c. 3D Isometric View (Premium Vector 3D Engine on Canvas!)
  const draw3dIsometricView = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // 3D projection formulas:
    // x3d = originX + (x - y) * cos(30deg)
    // y3d = originY + (x + y) * sin(30deg) - z
    
    const scale = container.length > 6 ? 32 : 64; // scale multiplier
    const originX = w / 2 - (container.length * scale * 0.4);
    const originY = h / 2 + (container.width * scale * 0.2);
    
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    
    const project = (x: number, y: number, z: number) => {
      return {
        px: originX + (x * scale * cos30) - (y * scale * cos30),
        py: originY + (x * scale * sin30) + (y * scale * sin30) - (z * scale)
      };
    };

    // Draw Container wireframe background wall
    ctx.strokeStyle = 'var(--border)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // Bottom grid lines
    for (let x = 0; x <= container.length; x += 1) {
      const p1 = project(x, 0, 0);
      const p2 = project(x, container.width, 0);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }
    for (let y = 0; y <= container.width; y += 0.5) {
      const p1 = project(0, y, 0);
      const p2 = project(container.length, y, 0);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw solid container walls (Front and Left faces wireframe)
    ctx.strokeStyle = 'var(--text-muted)';
    ctx.lineWidth = 2;
    
    // Front corner vertical
    const c1 = project(0, 0, 0);
    const c2 = project(0, 0, container.height);
    ctx.beginPath(); ctx.moveTo(c1.px, c1.py); ctx.lineTo(c2.px, c2.py); ctx.stroke();

    // Back left corner vertical
    const c3 = project(0, container.width, 0);
    const c4 = project(0, container.width, container.height);
    ctx.beginPath(); ctx.moveTo(c3.px, c3.py); ctx.lineTo(c4.px, c4.py); ctx.stroke();

    // Far right corner vertical
    const c5 = project(container.length, 0, 0);
    const c6 = project(container.length, 0, container.height);
    ctx.beginPath(); ctx.moveTo(c5.px, c5.py); ctx.lineTo(c6.px, c6.py); ctx.stroke();

    // Draw packed boxes (Sort items by X then by Y then by Z to ensure correct 3D overlapping!)
    const sortedItems = [...packingResult.items].sort((a, b) => {
      if (Math.abs(a.x - b.x) > 0.05) return a.x - b.x;
      if (Math.abs(a.y - b.y) > 0.05) return b.y - a.y; // back to front ordering in isometric
      return a.z - b.z;
    });

    sortedItems.forEach(item => {
      drawIsometricCube(ctx, item.x, item.y, item.z, item.length, item.width, item.height, cargo.color, project);
    });

    // Draw container top-front wireframe edges
    ctx.strokeStyle = 'var(--text-primary)';
    ctx.lineWidth = 2.5;
    
    // Bottom floor outline
    const f1 = project(0, 0, 0);
    const f2 = project(container.length, 0, 0);
    const f3 = project(container.length, container.width, 0);
    const f4 = project(0, container.width, 0);
    ctx.beginPath();
    ctx.moveTo(f1.px, f1.py); ctx.lineTo(f2.px, f2.py); ctx.lineTo(f3.px, f3.py);
    ctx.lineTo(f4.px, f4.py); ctx.closePath(); ctx.stroke();

    // Top ceiling outline
    const h1 = project(0, 0, container.height);
    const h2 = project(container.length, 0, container.height);
    const h3 = project(container.length, container.width, container.height);
    const h4 = project(0, container.width, container.height);
    ctx.beginPath();
    ctx.moveTo(h1.px, h1.py); ctx.lineTo(h2.px, h2.py); ctx.lineTo(h3.px, h3.py);
    ctx.lineTo(h4.px, h4.py); ctx.closePath(); ctx.stroke();
  };

  // Helper: Draw a single 3D block in isometric projection
  const drawIsometricCube = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, z: number,
    w: number, l: number, h: number,
    baseColor: string,
    project: (x: number, y: number, z: number) => { px: number; py: number }
  ) => {
    // Top corners
    const t0 = project(x, y, z + h);
    const t1 = project(x + w, y, z + h);
    const t2 = project(x + w, y + l, z + h);
    const t3 = project(x, y + l, z + h);

    // Bottom corners
    const b0 = project(x, y, z);
    const b3 = project(x, y + l, z);

    // Light Shading Factors
    const shadeTop = baseColor;
    const shadeRight = darkenColor(baseColor, -20); // Right side faces light angle
    const shadeLeft = darkenColor(baseColor, -40);  // Left side in shadow

    // 1. Draw Left Face (X face facing Left-Down)
    ctx.fillStyle = shadeLeft;
    ctx.beginPath();
    ctx.moveTo(b0.px, b0.py);
    ctx.lineTo(b3.px, b3.py);
    ctx.lineTo(t3.px, t3.py);
    ctx.lineTo(t0.px, t0.py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();

    // 2. Draw Right Face (Y face facing Right-Down)
    ctx.fillStyle = shadeRight;
    ctx.beginPath();
    ctx.moveTo(b3.px, b3.py);
    ctx.lineTo(b0.px, b0.py); // Using b0 as the reference point for the right face
    ctx.lineTo(t1.px, t1.py); // Using t1 as the top corner
    ctx.lineTo(t3.px, t3.py);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Draw Top Face (Z face facing Straight Up)
    ctx.fillStyle = shadeTop;
    ctx.beginPath();
    ctx.moveTo(t0.px, t0.py);
    ctx.lineTo(t1.px, t1.py);
    ctx.lineTo(t2.px, t2.py);
    ctx.lineTo(t3.px, t3.py);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Helper: Darken/Lighten HEX colors
  const darkenColor = (col: string, amt: number) => {
    let usePound = false;
    if (col[0] === "#") {
      col = col.slice(1);
      usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  };

  // 2. HTML5 Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const w = canvas.width;
    const h = canvas.height;
    
    // Enable antialiasing
    ctx.imageSmoothingEnabled = true;

    // View specific drawer
    if (viewMode === 'top') {
      drawTopView(ctx, w, h);
    } else if (viewMode === 'side') {
      drawSideView(ctx, w, h);
    } else {
      draw3dIsometricView(ctx, w, h);
    }
  }, [viewMode, selectedContainer, selectedCargo, packingResult]);

  return (
    <div className="container-planner-dashboard">
      
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2.5rem' }}>
        
        {/* 1. Sidebar Parameters Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: 0 }}>
          <div className="card-header" style={{ padding: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <h3>Configurar Cubicaje</h3>
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

          {/* Cargo Type Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              Tipo de Carga / Bulto:
            </label>
            <select
              className="search-input"
              style={{ padding: '0.75rem', borderRadius: '0.75rem' }}
              value={selectedCargo}
              onChange={e => setSelectedCargo(Number(e.target.value))}
            >
              {CARGO_ITEMS.map((item, idx) => (
                <option key={idx} value={idx}>
                  {item.name} ({item.length}x{item.width}m, {item.weight}T)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cantidad a Cargar:</span>
              <strong className="text-accent">{quantity} unidades</strong>
            </div>
            <input 
              type="range" 
              min={1} 
              max={60} 
              className="slider-range-stuffing"
              style={{ width: '100%', accentColor: 'var(--accent)' }}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
            />
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
                <AlertTriangle className="text-warning" size={18} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#f59e0b' }}>
                  ¡Capacidad Excedida! {packingResult.leftOut} bultos quedaron fuera.
                </span>
              </div>
            ) : packingResult.weightUtilPercent > 90 ? (
              <div className="card-notes-panel" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.85rem', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertTriangle className="text-danger" size={18} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ef4444' }}>
                  Peso límite crítico superado ({packingResult.weightUtilPercent.toFixed(0)}%).
                </span>
              </div>
            ) : (
              <div className="card-notes-panel" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.85rem', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <ShieldCheck className="text-success" size={18} style={{ color: '#10b981' }} />
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
                <h4 style={{ fontWeight: 'bold' }}>Simulador Tridimensional de Estiba</h4>
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
              <canvas 
                ref={canvasRef} 
                width={720} 
                height={400}
                style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
              />
              
              {/* Floating perspective legend */}
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
                  gap: '0.25rem'
                }}
              >
                <RotateCw size={12} />
                <span>Rotación de cámara automática (Perspectiva Fija)</span>
              </div>
            </div>
          </div>

          {/* Volume and Weight Statistics Matrix */}
          <div className="report-kpi-grid">
            
            <div className="kpi-panel-card">
              <span className="kpi-label">Uso de Volumen</span>
              <h2 className="kpi-value text-accent">{packingResult.volUtilPercent.toFixed(1)}%</h2>
              <span className="kpi-detail">Volumen cargado: {(packingResult.itemsPacked * cargo.length * cargo.width * cargo.height).toFixed(1)}m³ / {container.volume}m³</span>
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
                {packingResult.itemsPacked} / {quantity}
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
