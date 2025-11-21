

import React, { useRef, useEffect, useState, MouseEvent } from 'react';
import { Candle, TechnicalIndicators, Position, OrderSide, IndicatorType, DrawingObject, Order, OrderStatus, OrderType } from '../types';

interface ChartCanvasProps {
  data: Candle[];
  indicators: TechnicalIndicators;
  activeIndicators: IndicatorType[];
  positions: Position[];
  orders: Order[];
  currentPair: string;
  drawMode: 'none' | 'trendline' | 'ray' | 'horizontal' | 'fib' | 'rect' | 'channel';
  drawColor: string;
  onDrawingComplete: (d: DrawingObject) => void;
  onDeleteDrawing: (id: string) => void;
  drawings: DrawingObject[];
  className?: string;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({ 
    data, 
    indicators, 
    activeIndicators,
    positions, 
    orders,
    currentPair, 
    drawMode, 
    drawColor,
    onDrawingComplete,
    onDeleteDrawing,
    drawings,
    className 
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 400 });
  const [crosshair, setCrosshair] = useState<{x: number, y: number} | null>(null);
  
  // View State
  const [viewState, setViewState] = useState<{offset: number, candleWidth: number}>(() => {
      try {
          const saved = localStorage.getItem(`chart_view_${currentPair}`);
          return saved ? JSON.parse(saved) : { offset: 0, candleWidth: 8 };
      } catch (e) {
          return { offset: 0, candleWidth: 8 };
      }
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [tempDrawing, setTempDrawing] = useState<{start: {x:number, y:number, time:number, price:number}, current: {x:number, y:number}} | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);

  useEffect(() => {
      localStorage.setItem(`chart_view_${currentPair}`, JSON.stringify(viewState));
  }, [viewState, currentPair]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(entries => {
      setDimensions({ w: entries[0].contentRect.width, h: entries[0].contentRect.height });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            setViewState(prev => {
                const newWidth = Math.max(2, Math.min(100, prev.candleWidth - (e.deltaY * 0.02)));
                return { ...prev, candleWidth: newWidth };
            });
        } else {
            const sensitivity = 0.2;
            setViewState(prev => ({ 
                ...prev, 
                offset: Math.max(0, prev.offset + (e.deltaY * sensitivity)) 
            }));
        }
    };
    const c = canvasRef.current;
    if (c) c.addEventListener('wheel', handleWheel, { passive: false });
    return () => c?.removeEventListener('wheel', handleWheel);
  }, []);

  // --- HELPERS ---
  const getXFromTime = (time: number, startIdx: number, cw: number, gap: number) => {
        let idx = data.findIndex(c => c.time >= time);
        if (idx === -1) {
             if (data.length > 0 && time > data[data.length-1].time) idx = data.length + 1; 
             else idx = 0;
        }
        const relativeIdx = idx - startIdx;
        return (relativeIdx * (cw + gap)) + (cw/2);
  };

  const distanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const A = px - x1; const B = py - y1; const C = x2 - x1; const D = y2 - y1;
      const dot = A * C + B * D; const lenSq = C * C + D * D;
      let param = -1; if (lenSq !== 0) param = dot / lenSq;
      let xx, yy;
      if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; } else { xx = x1 + param * C; yy = y1 + param * D; }
      const dx = px - xx; const dy = py - yy; return Math.sqrt(dx * dx + dy * dy);
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;

    const PADDING_RIGHT = 60;
    const PADDING_BOTTOM = 25;
    const CHART_W = w - PADDING_RIGHT;
    
    const bottomIndicators = activeIndicators.filter(i => ['rsi', 'macd', 'stoch', 'metalIndex'].includes(i));
    const IND_PANEL_H = h * 0.15;
    const TOTAL_IND_H = bottomIndicators.length * IND_PANEL_H;
    const MAIN_H = Math.max(h * 0.3, h - PADDING_BOTTOM - TOTAL_IND_H);

    const CW = viewState.candleWidth;
    const GAP = CW * 0.2;
    const maxVisibleCandles = Math.ceil(CHART_W / (CW + GAP));
    
    const totalCandles = data.length;
    let endIdx = totalCandles - Math.floor(viewState.offset);
    if (endIdx > totalCandles) endIdx = totalCandles;
    if (endIdx < 0) endIdx = 0; 

    let startIdx = endIdx - maxVisibleCandles;
    const sliceStart = Math.max(0, startIdx);
    const sliceEnd = Math.max(0, endIdx);
    const visibleData = data.slice(sliceStart, sliceEnd);
    
    const colors = { bg: '#020309', up: '#2ebd85', down: '#f6465d', grid: '#1e222d', text: '#848e9c', crosshair: '#ffffff', overlay: '#37c5ff', drawing: '#eab308', vwap: '#a855f7' };

    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, w, h);

    let minPrice = Infinity, maxPrice = -Infinity, maxVol = 0;
    if (visibleData.length > 0) {
        visibleData.forEach(c => {
            if (c.low < minPrice) minPrice = c.low;
            if (c.high > maxPrice) maxPrice = c.high;
            if (c.volume > maxVol) maxVol = c.volume;
        });
    } else {
        const last = data[data.length-1];
        if(last) { minPrice = last.low * 0.9; maxPrice = last.high * 1.1; } else { minPrice = 0; maxPrice = 100; }
    }

    if (activeIndicators.includes('bollinger') && visibleData.length > 0) { minPrice *= 0.99; maxPrice *= 1.01; }
    if (minPrice === maxPrice) { minPrice *= 0.95; maxPrice *= 1.05; }
    const priceRange = maxPrice - minPrice;
    const priceScale = MAIN_H / priceRange;

    const getY = (p: number) => MAIN_H - (p - minPrice) * priceScale;
    const getX = (idx: number) => (idx - startIdx) * (CW + GAP); 
    
    // Grid
    ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath();
    const gridRows = 6;
    for(let i=0; i<=gridRows; i++) {
      const y = (MAIN_H / gridRows) * i; ctx.moveTo(0, y); ctx.lineTo(CHART_W, y);
      const p = maxPrice - (i * (priceRange/gridRows));
      ctx.fillStyle = colors.text; ctx.font = '10px Inter'; ctx.fillText(p.toFixed(2), CHART_W + 5, y + 3);
    }
    const pixelsPerGrid = 100;
    const candlesPerGrid = Math.ceil(pixelsPerGrid / (CW + GAP));
    const fvi = Math.floor(startIdx); const offsetIndex = fvi % candlesPerGrid;
    for(let i = fvi - offsetIndex; i < endIdx; i += candlesPerGrid) {
        if (i < 0 || i >= data.length) continue;
        const x = getX(i) + CW/2;
        if (x < 0 || x > CHART_W) continue;
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
        const d = new Date(data[i].time);
        const timeStr = (visibleData[visibleData.length-1]?.time - visibleData[0]?.time > 86400000) ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
        ctx.fillText(timeStr, x, h - 5);
    }
    ctx.stroke();

    // Candles
    const VOL_H = MAIN_H * 0.15;
    visibleData.forEach((c, i) => {
      const globalIdx = sliceStart + i;
      const x = getX(globalIdx);
      
      const volHeight = (c.volume / maxVol) * VOL_H;
      ctx.fillStyle = c.close >= c.open ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)'; 
      ctx.fillRect(x, MAIN_H - volHeight, CW, volHeight);

      const openY = getY(c.open); const closeY = getY(c.close); const highY = getY(c.high); const lowY = getY(c.low);
      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp ? colors.up : colors.down; ctx.strokeStyle = isUp ? colors.up : colors.down; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + CW/2, highY); ctx.lineTo(x + CW/2, lowY); ctx.stroke();
      ctx.fillRect(x, Math.min(openY, closeY), CW, Math.max(Math.abs(closeY - openY), 1));
    });

    // Drawings
    const renderDrawing = (d: DrawingObject, isHovered: boolean, isTemp: boolean) => {
        const x1 = isTemp ? (d as any).p1.x : getXFromTime(d.p1.time, startIdx, CW, GAP);
        const y1 = isTemp ? (d as any).p1.y : getY(d.p1.price);
        const x2 = isTemp ? (d as any).p2.x : (d.type === 'horizontal' ? CHART_W : getXFromTime(d.p2.time, startIdx, CW, GAP));
        const y2 = isTemp ? (d as any).p2.y : (d.type === 'horizontal' ? y1 : getY(d.p2.price));

        ctx.shadowColor = isHovered ? 'rgba(255,255,255,0.8)' : 'transparent';
        ctx.shadowBlur = isHovered ? 15 : 0;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeStyle = isHovered ? '#ffffff' : d.color;
        ctx.setLineDash(isTemp ? [4,4] : []);

        if (d.type === 'trendline' || d.type === 'ray' || d.type === 'horizontal') {
            ctx.beginPath(); ctx.moveTo(x1, y1);
            if (d.type === 'ray' && !isTemp) {
                 const dx = x2 - x1; const dy = y2 - y1;
                 const m = dy/dx; const endX = dx > 0 ? CHART_W : 0; const endY = y1 + m * (endX - x1);
                 ctx.lineTo(endX, endY);
            } else {
                 ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        } 
        else if (d.type === 'rect') {
            ctx.fillStyle = d.color + '20'; // 20 hex alpha
            ctx.fillRect(x1, y1, x2-x1, y2-y1);
            ctx.strokeRect(x1, y1, x2-x1, y2-y1);
        }
        else if (d.type === 'fib') {
            // Fibonacci Retracement
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            const diffY = y2 - y1;
            
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.setLineDash([2,2]); ctx.stroke(); // Trend line
            ctx.setLineDash([]);

            levels.forEach(level => {
                const y = y1 + (diffY * level);
                ctx.beginPath(); ctx.moveTo(Math.min(x1, x2), y); ctx.lineTo(Math.max(x1, x2), y);
                ctx.stroke();
                ctx.fillStyle = d.color; ctx.font = '9px Inter';
                ctx.fillText(`${level}`, Math.max(x1, x2) + 2, y + 3);
            });
        }
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    };

    drawings.forEach(d => renderDrawing(d, hoveredDrawingId === d.id, false));
    if (tempDrawing && drawMode !== 'none') {
        const dummyD: any = { type: drawMode, p1: tempDrawing.start, p2: tempDrawing.current, color: drawColor };
        renderDrawing(dummyD, false, true);
    }

    // Indicator Panels
    let currentPanelY = MAIN_H;
    bottomIndicators.forEach(ind => {
        const hPanel = IND_PANEL_H; const yBase = currentPanelY + hPanel;
        ctx.strokeStyle = colors.grid; ctx.beginPath(); ctx.moveTo(0, currentPanelY); ctx.lineTo(w, currentPanelY); ctx.stroke();
        ctx.fillStyle = colors.overlay; ctx.fillText(ind.toUpperCase(), 5, currentPanelY + 15);
        if (ind === 'rsi') {
             ctx.beginPath(); ctx.strokeStyle = '#7b5bff';
             for(let i=0; i<visibleData.length; i++) {
                 const globalIdx = sliceStart + i; const x = getX(globalIdx) + CW/2;
                 const c = visibleData[i]; const change = (c.close - c.open) / c.open;
                 const simRsi = 50 + (change * 1000) + (Math.sin(globalIdx * 0.2) * 20);
                 const clamped = Math.max(0, Math.min(100, simRsi));
                 const y = yBase - ((clamped / 100) * hPanel);
                 if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
             }
             ctx.stroke();
        }
        currentPanelY += hPanel;
    });

    // Crosshair
    if (crosshair && crosshair.x < CHART_W && crosshair.y < MAIN_H) {
      ctx.strokeStyle = colors.crosshair; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(crosshair.x, 0); ctx.lineTo(crosshair.x, MAIN_H); ctx.moveTo(0, crosshair.y); ctx.lineTo(CHART_W, crosshair.y); ctx.stroke(); ctx.setLineDash([]);
      const p = minPrice + ((MAIN_H - crosshair.y) / priceScale);
      ctx.fillStyle = '#1e222d'; ctx.fillRect(CHART_W, crosshair.y - 10, PADDING_RIGHT, 20);
      ctx.fillStyle = '#fff'; ctx.fillText(p.toFixed(2), CHART_W + 5, crosshair.y + 4);
    }

  }, [data, dimensions, crosshair, indicators, positions, orders, activeIndicators, viewState, drawings, tempDrawing, drawMode, drawColor, hoveredDrawingId]);

  const handleMouseDown = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect(); if(!rect) return;
      const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      
      if (e.button === 2) { if (hoveredDrawingId) { e.preventDefault(); onDeleteDrawing(hoveredDrawingId); } return; }

      if (drawMode !== 'none') {
          setTempDrawing({ start: {x,y, time: Date.now(), price: 0}, current: {x,y} });
      } else {
          setIsDragging(true); setDragStart({ x, y });
      }
  };

  const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect(); if(!rect) return;
      const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      setCrosshair({x, y});

      // Hit Test
      if (drawMode === 'none' && !isDragging) {
          const MAIN_H = dimensions.h * 0.3; 
          const CW = viewState.candleWidth; const GAP = CW * 0.2;
          const endIdx = data.length - Math.floor(viewState.offset);
          const startIdx = endIdx - Math.ceil((dimensions.w - 60) / (CW + GAP));
          
          // Re-calc scale for hit test
          const slice = data.slice(Math.max(0, startIdx), Math.max(0, endIdx));
          let minP = Infinity, maxP = -Infinity;
          slice.forEach(c => { if(c.low<minP) minP=c.low; if(c.high>maxP) maxP=c.high; });
          if(minP===Infinity) {minP=0; maxP=100;}
          if(activeIndicators.includes('bollinger')) { minP*=0.99; maxP*=1.01; }
          const scale = MAIN_H / (maxP - minP);
          const getY = (p: number) => MAIN_H - (p - minP) * scale;

          let foundId: string | null = null;
          drawings.forEach(d => {
             const x1 = getXFromTime(d.p1.time, startIdx, CW, GAP); const y1 = getY(d.p1.price);
             const x2 = d.type === 'horizontal' ? dimensions.w : getXFromTime(d.p2.time, startIdx, CW, GAP);
             const y2 = d.type === 'horizontal' ? y1 : getY(d.p2.price);
             
             if (d.type === 'rect') {
                 const left = Math.min(x1, x2), right = Math.max(x1, x2), top = Math.min(y1, y2), bottom = Math.max(y1, y2);
                 if (x >= left && x <= right && y >= top && y <= bottom) foundId = d.id;
             } else {
                 if (distanceToLine(x, y, x1, y1, x2, y2) < 10) foundId = d.id;
             }
          });
          setHoveredDrawingId(foundId);
      }

      if (drawMode !== 'none' && tempDrawing) {
          setTempDrawing(prev => prev ? { ...prev, current: {x,y} } : null);
      } else if (isDragging && dragStart) {
          const deltaX = dragStart.x - x;
          const shift = deltaX / (viewState.candleWidth * 1.5); 
          setViewState(prev => ({ ...prev, offset: prev.offset + shift }));
          setDragStart({ x, y });
      }
  };

  const handleMouseUp = (e: MouseEvent) => {
      if (drawMode !== 'none' && tempDrawing) {
          const lastData = data[data.length-1];
          const price = lastData ? lastData.close : 0; 
          
          // We need to convert the 'current' mouse X/Y back to time/price for saving
          // Simplified: just save what we have for p2 if it was drawn visually, 
          // but realistically we need inverse projection.
          // For this demo, we simply use current time/price for p2 to keep data valid.
          
          const rect = canvasRef.current?.getBoundingClientRect();
          const MAIN_H = dimensions.h * 0.3;
          const CW = viewState.candleWidth; const GAP = CW * 0.2;
          const endIdx = data.length - Math.floor(viewState.offset);
          const startIdx = endIdx - Math.ceil((dimensions.w - 60) / (CW + GAP));
          const slice = data.slice(Math.max(0, startIdx), Math.max(0, endIdx));
          let minP = Infinity, maxP = -Infinity;
          slice.forEach(c => { if(c.low<minP) minP=c.low; if(c.high>maxP) maxP=c.high; });
          if(minP===Infinity){minP=0; maxP=100;}
          const scale = MAIN_H / (maxP - minP);

          const yToPrice = (y: number) => minP + ((MAIN_H - y) / scale);
          const p1Price = yToPrice(tempDrawing.start.y);
          const p2Price = yToPrice(tempDrawing.current.y);

          const xToTime = (x: number) => {
               const relIdx = (x - (CW/2)) / (CW+GAP);
               const absIdx = Math.round(startIdx + relIdx);
               return data[Math.max(0, Math.min(data.length-1, absIdx))]?.time || Date.now();
          };

          const p1Time = xToTime(tempDrawing.start.x);
          const p2Time = xToTime(tempDrawing.current.x);

          const newDrawing: DrawingObject = {
              id: Math.random().toString(),
              type: drawMode,
              p1: { time: p1Time, price: p1Price }, 
              p2: { time: p2Time, price: p2Price }, 
              color: drawColor,
              locked: false
          };
          onDrawingComplete(newDrawing); 
          setTempDrawing(null);
      }
      setIsDragging(false); setDragStart(null);
  };

  return (
    <div ref={wrapperRef} className={`w-full h-full relative ${className} ${isDragging ? 'cursor-grabbing' : drawMode !== 'none' ? 'cursor-crosshair' : hoveredDrawingId ? 'cursor-pointer' : 'cursor-grab'}`} onContextMenu={e => e.preventDefault()}>
      <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { setCrosshair(null); setIsDragging(false); }} className="touch-none block"/>
       {hoveredDrawingId && <div className="absolute top-2 left-2 bg-red-500/90 text-white text-[10px] px-2 py-1 rounded font-bold pointer-events-none shadow-lg animate-pulse">Right-click to delete</div>}
    </div>
  );
};

export default ChartCanvas;