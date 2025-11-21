
import { Candle, Order, OrderBookState, OrderSide, OrderStatus, OrderType, Trade, Ticker, WalletAsset, TradingMode, PairSymbol, MarketPairConfig, Position, TechnicalIndicators, Robot, UserTrade } from "../types";

/**
 * AYNU CORE TRADING ENGINE v3.1
 * Features: WebSocket Stream, Throttled Updates, Granular OrderBook, Robots, AI vectors, Extended Timeframes,
 *           Trade History, Market Order Execution, Real-time PNL.
 */

const REAL_API_BASE = 'https://price.orcaamr.com/api'; 
const WS_BASE = 'wss://price.orcaamr.com/ws'; 
const REFRESH_RATE = 1000; 
const UI_THROTTLE_MS = 100; 
const FEE_RATE = 0.0006; // 0.06% fee

export const PAIRS: Record<PairSymbol, MarketPairConfig> = {
  'AMR/NVR': { symbol: 'AMR/NVR', base: 'AMR', quote: 'NVR', minAmount: 0.1, priceDecimals: 2, amountDecimals: 4 },
  'IONX/NVR': { symbol: 'IONX/NVR', base: 'IONX', quote: 'NVR', minAmount: 1, priceDecimals: 4, amountDecimals: 2 },
  'AMR/IONX': { symbol: 'AMR/IONX', base: 'AMR', quote: 'IONX', minAmount: 0.01, priceDecimals: 4, amountDecimals: 4 },
};

const DEMO_PRICES = {
  'AMR/NVR': 4250.00,
  'IONX/NVR': 12.45,
  'AMR/IONX': 341.36
};

// Extended Timeframes
export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '12H', '1D', '3D', '1W', '1M', '1Y'];

class MarketService {
  private mode: TradingMode = TradingMode.SPOT;
  private currentPair: PairSymbol = 'AMR/NVR';
  private timeframe: string = '1m';
  private listeners: Set<() => void> = new Set();
  private intervalId: any = null;
  private isLive: boolean = true;
  
  // WebSocket
  private ws: WebSocket | null = null;
  private lastNotifyTime = 0;
  private pendingNotify = false;

  // Data Stores
  private bidMap = new Map<number, number>();
  private askMap = new Map<number, number>();
  
  private orderBook: OrderBookState = this.getEmptyBook();
  private trades: Trade[] = [];
  private candles: Candle[] = [];
  private ticker: Ticker = this.getEmptyTicker();
  
  // User Data
  private userOrders: Order[] = [];
  private userTradeHistory: UserTrade[] = []; // Log of executed trades
  private positions: Position[] = []; 
  private wallet: Map<string, WalletAsset> = new Map();
  private robots: Robot[] = [];
  
  // Technicals
  private indicators: TechnicalIndicators = this.getEmptyIndicators();

  constructor() {
    this.initializeWallet();
    this.initializeRobots();
    this.startEngine();
  }

  public setMode(mode: TradingMode) {
    this.mode = mode;
    this.setPair(this.currentPair);
  }

  public setPair(pair: PairSymbol) {
    this.currentPair = pair;
    this.trades = [];
    this.candles = []; 
    this.bidMap.clear();
    this.askMap.clear();
    this.orderBook = this.getEmptyBook();
    this.ticker = this.getEmptyTicker();
    
    if (this.mode !== TradingMode.DEMO) {
       this.fetchHistory();
       this.connectWebSocket();
    } else {
       if (this.ws) { this.ws.close(); this.ws = null; }
       this.generateDemoHistory();
    }
    this.notify();
  }

  public setTimeframe(tf: string) {
      this.timeframe = tf;
      if (this.mode !== TradingMode.DEMO) {
          this.fetchHistory();
      } else {
          this.generateDemoHistory(); 
      }
      this.notify();
  }

  public toggleConnection() {
    this.isLive = !this.isLive;
    if (this.isLive) {
      this.startEngine();
    } else {
      if (this.intervalId) clearInterval(this.intervalId);
      if (this.ws) this.ws.close();
    }
    this.notify();
  }

  public toggleRobot(id: string) {
    const r = this.robots.find(r => r.id === id);
    if (r) {
      r.active = !r.active;
      this.saveRobots();
      this.notify();
    }
  }

  public getPairConfig(): MarketPairConfig {
    return PAIRS[this.currentPair];
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const now = Date.now();
    if (now - this.lastNotifyTime > UI_THROTTLE_MS) {
        this.lastNotifyTime = now;
        this.pendingNotify = false;
        this.listeners.forEach(cb => cb());
    } else {
        if (!this.pendingNotify) {
            this.pendingNotify = true;
            setTimeout(() => this.notify(), UI_THROTTLE_MS);
        }
    }
  }

  public getData() {
    return {
      mode: this.mode,
      pair: this.currentPair,
      timeframe: this.timeframe,
      ticker: this.ticker,
      orderBook: this.orderBook,
      trades: this.trades,
      candles: this.candles,
      wallet: Array.from(this.wallet.values()),
      orders: this.userOrders,
      tradeHistory: this.userTradeHistory,
      positions: this.positions,
      indicators: this.indicators,
      robots: this.robots,
      isLive: this.isLive
    };
  }

  public getMarketContext(): string {
      const trend = this.indicators.ema20 > this.indicators.sma20 ? 'Bullish' : 'Bearish';
      const volatility = this.indicators.bollinger.upper - this.indicators.bollinger.lower;
      return `
        Pair: ${this.currentPair}
        Price: ${this.ticker.lastPrice}
        Trend: ${trend}
        RSI: ${this.indicators.rsi.toFixed(2)}
        MACD: ${this.indicators.macd.value.toFixed(4)}
        Bollinger Width: ${volatility.toFixed(2)}
        Metal Index: ${this.indicators.metalIndex.toFixed(2)}
        Volume 24h: ${this.ticker.volume24h.toFixed(2)}
      `;
  }

  private startEngine() {
    if (this.intervalId) clearInterval(this.intervalId);
    
    if (this.mode !== TradingMode.DEMO) {
       this.fetchHistory();
       this.connectWebSocket();
    } else {
       if (this.candles.length === 0) this.generateDemoHistory();
    }

    this.intervalId = setInterval(async () => {
      if (!this.isLive) return;

      if (this.mode === TradingMode.DEMO) {
        this.simulateTick();
      } else {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this.fetchRealData();
        }
      }
      
      this.updatePositions(); // Critical for real-time PNL
      this.updateRobots();
      this.calculateIndicators();
      // Always notify on tick to ensure PNL updates in UI even if no new trade came in
      this.notify();
    }, REFRESH_RATE);
  }

  private initializeRobots() {
    try {
        const saved = localStorage.getItem('aynu_robots_v2');
        if (saved) {
            this.robots = JSON.parse(saved);
        } else {
            this.robots = [
                { id: '1', name: 'Nova Scalper', description: 'High-frequency scalping on low timeframe volatility.', active: false, pnl: 124.50, pnlPercent: 12.4, strategy: 'scalp', pair: 'AMR/NVR' },
                { id: '2', name: 'Ion Grid Alpha', description: 'Neutral grid trading strategy for consolidating markets.', active: true, pnl: 45.20, pnlPercent: 4.5, strategy: 'grid', pair: 'IONX/NVR' },
                { id: '3', name: 'Cosmic Arb v2', description: 'Cross-exchange arbitrage detection.', active: false, pnl: -12.00, pnlPercent: -1.2, strategy: 'arbitrage', pair: 'AMR/IONX' },
                { id: '4', name: 'DeepMind Sentiment', description: 'AI-driven sentiment analysis execution.', active: true, pnl: 342.10, pnlPercent: 34.2, strategy: 'ai_sentiment', pair: 'AMR/NVR' }
            ];
        }
    } catch (e) {
        this.robots = [];
    }
  }

  private saveRobots() {
      localStorage.setItem('aynu_robots_v2', JSON.stringify(this.robots));
  }

  private updateRobots() {
    let changed = false;
    this.robots.forEach(r => {
      if (r.active) {
        const volatility = 0.2; 
        const drift = (Math.random() - 0.48);
        const change = drift * volatility;
        r.pnl += change;
        r.pnlPercent = (r.pnl / 1000) * 100; 
        changed = true;
      }
    });
    if (changed) this.saveRobots();
  }

  public calculatePositionExit(position: Position, closeAmount: number, currentPrice: number) {
      const isLong = position.side === OrderSide.BUY;
      const entryVal = closeAmount * position.entryPrice;
      const exitVal = closeAmount * currentPrice;
      const fee = exitVal * FEE_RATE;
      
      const grossPnl = isLong ? (exitVal - entryVal) : (entryVal - exitVal);
      const netPnl = grossPnl - fee;
      
      return {
          exitValue: exitVal,
          fee: fee,
          grossPnl: grossPnl,
          netPnl: netPnl
      };
  }

  private connectWebSocket() {
      if (this.ws) {
          this.ws.close();
          this.ws = null;
      }
      try {
        this.ws = new WebSocket(`${WS_BASE}?symbol=${this.currentPair}`);
        this.ws.onmessage = (event) => {
            if (!this.isLive) return;
            try {
                const msg = JSON.parse(event.data);
                this.handleWebSocketMessage(msg);
            } catch (e) {}
        };
      } catch (e) {}
  }

  private handleWebSocketMessage(msg: any) {
      if (msg.e === 'depthUpdate') {
          if (msg.b) {
             msg.b.forEach((b: any) => {
                 const price = Number(b[0]);
                 const qty = Number(b[1]);
                 if (qty === 0) this.bidMap.delete(price);
                 else this.bidMap.set(price, qty);
             });
          }
          if (msg.a) {
             msg.a.forEach((a: any) => {
                 const price = Number(a[0]);
                 const qty = Number(a[1]);
                 if (qty === 0) this.askMap.delete(price);
                 else this.askMap.set(price, qty);
             });
          }
          this.rebuildOrderBook();
      }

      if (msg.e === 'trade' || msg.e === 'aggTrade') {
          const trade: Trade = {
              id: msg.t || Math.random().toString(),
              price: Number(msg.p),
              amount: Number(msg.q),
              side: msg.m ? OrderSide.SELL : OrderSide.BUY, 
              timestamp: msg.T
          };
          
          this.trades.unshift(trade);
          if (this.trades.length > 100) this.trades.pop(); 
          
          this.ticker.lastPrice = trade.price;
          this.updateCandle(trade.price, trade.amount);
          
          // IMPORTANT: Update PNL on every price change
          this.updatePositions();
      }

      if (msg.e === '24hrTicker') {
          this.ticker = {
              symbol: this.currentPair,
              lastPrice: Number(msg.c),
              priceChangePercent: Number(msg.P),
              high24h: Number(msg.h),
              low24h: Number(msg.l),
              volume24h: Number(msg.v)
          };
      }

      this.notify();
  }

  private rebuildOrderBook() {
      const bids = Array.from(this.bidMap.entries()).map(([price, amount]) => ({ price, amount, total: 0, cumulativeTotal: 0 }));
      const asks = Array.from(this.askMap.entries()).map(([price, amount]) => ({ price, amount, total: 0, cumulativeTotal: 0 }));

      bids.sort((a,b) => b.price - a.price); // Descending
      asks.sort((a,b) => a.price - b.price); // Ascending

      const topBids = bids.slice(0, 20);
      const topAsks = asks.slice(0, 20);

      let bAcc = 0; topBids.forEach(b => { b.total = b.price * b.amount; bAcc += b.total; b.cumulativeTotal = bAcc; });
      let aAcc = 0; topAsks.forEach(a => { a.total = a.price * a.amount; aAcc += a.total; a.cumulativeTotal = aAcc; });

      this.orderBook = {
          bids: topBids,
          asks: topAsks,
          lastPrice: this.ticker.lastPrice,
          spread: (topAsks[0]?.price || 0) - (topBids[0]?.price || 0),
          maxDepth: Math.max(bAcc, aAcc)
      };
  }

  private async fetchHistory() {
    try {
        const interval = this.timeframe; 
        const res = await fetch(`${REAL_API_BASE}/klines?symbol=${this.currentPair}&interval=${interval}&limit=500`);
        if (res.ok) {
            const data = await res.json();
            this.candles = data.map((d: any) => ({
                time: Number(d[0]),
                open: Number(d[1]),
                high: Number(d[2]),
                low: Number(d[3]),
                close: Number(d[4]),
                volume: Number(d[5])
            }));
            this.calculateIndicators();
        }
    } catch (e) {}
  }

  private async fetchRealData() {
    try {
      const [depthRes, tickerRes, tradesRes] = await Promise.all([
        fetch(`${REAL_API_BASE}/depth?symbol=${this.currentPair}&limit=20`).catch(() => null),
        fetch(`${REAL_API_BASE}/ticker?symbol=${this.currentPair}`).catch(() => null),
        fetch(`${REAL_API_BASE}/trades?symbol=${this.currentPair}&limit=50`).catch(() => null)
      ]);

      if (depthRes?.ok) {
        const depth = await depthRes.json();
        this.bidMap.clear();
        this.askMap.clear();
        (depth.bids || []).forEach((b: any) => this.bidMap.set(Number(b[0]), Number(b[1])));
        (depth.asks || []).forEach((a: any) => this.askMap.set(Number(a[0]), Number(a[1])));
        this.rebuildOrderBook();
      }

      if (tickerRes?.ok) {
        const tickerData = await tickerRes.json();
        this.ticker = {
          symbol: this.currentPair,
          lastPrice: Number(tickerData.lastPrice),
          priceChangePercent: Number(tickerData.priceChangePercent),
          high24h: Number(tickerData.highPrice),
          low24h: Number(tickerData.lowPrice),
          volume24h: Number(tickerData.volume)
        };
      }

      if (tradesRes?.ok) {
         const tradesData = await tradesRes.json();
         if (Array.isArray(tradesData)) {
             this.trades = tradesData.map((t:any) => ({
                 id: t.id || Math.random().toString(),
                 price: Number(t.price),
                 amount: Number(t.qty),
                 side: t.isBuyerMaker ? OrderSide.SELL : OrderSide.BUY,
                 timestamp: t.time
             })).slice(0, 50);
         }
      }
    } catch (e) {}
  }

  private simulateTick() {
    const volatility = this.currentPair === 'IONX/NVR' ? 0.005 : 0.001;
    const lastPrice = this.ticker.lastPrice || DEMO_PRICES[this.currentPair];
    
    const change = lastPrice * (Math.random() - 0.5) * volatility;
    const newPrice = Math.max(0.000001, lastPrice + change);

    this.ticker = {
      symbol: this.currentPair,
      lastPrice: newPrice,
      priceChangePercent: this.ticker.priceChangePercent + ((Math.random() - 0.5) * 0.1),
      high24h: Math.max(this.ticker.high24h, newPrice),
      low24h: Math.min(this.ticker.low24h, newPrice),
      volume24h: this.ticker.volume24h + Math.random() * 10
    };

    const center = newPrice;
    for(let i=0; i<5; i++) {
        const spread = (i+1) * (center * 0.0005);
        const bidP = center - spread;
        const askP = center + spread;
        this.bidMap.set(Number(bidP.toFixed(4)), Math.random() * 5);
        this.askMap.set(Number(askP.toFixed(4)), Math.random() * 5);
    }
    if (this.bidMap.size > 50) {
        const sorted = Array.from(this.bidMap.keys()).sort((a,b) => b-a);
        sorted.slice(50).forEach(k => this.bidMap.delete(k));
    }
    this.rebuildOrderBook();

    if (Math.random() > 0.5) {
      const side = Math.random() > 0.5 ? OrderSide.BUY : OrderSide.SELL;
      const amount = Math.random() * 2;
      const t = {
        id: Math.random().toString(36),
        price: newPrice,
        amount: amount,
        side: side,
        timestamp: Date.now()
      };
      this.trades.unshift(t);
      if (this.trades.length > 100) this.trades.pop();
      this.updateCandle(newPrice, amount);
      // Update PNL
      this.updatePositions();
    }
  }

  private generateDemoHistory() {
    const now = Date.now();
    let price = DEMO_PRICES[this.currentPair];
    const history: Candle[] = [];
    const intervalMap: any = { 
        '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000,
        '1H': 3600000, '4H': 14400000, '12H': 43200000, '1D': 86400000,
        '3D': 259200000, '1W': 604800000, '1M': 2592000000, '1Y': 31536000000
    };
    const ms = intervalMap[this.timeframe] || 60000;
    
    for(let i = 500; i > 0; i--) {
      const time = now - (i * ms);
      const open = price;
      const close = open * (1 + (Math.random() * 0.02 - 0.01));
      history.push({
        time,
        open,
        close,
        high: Math.max(open, close) * 1.002,
        low: Math.min(open, close) * 0.998,
        volume: Math.random() * 100
      });
      price = close;
    }
    this.candles = history;
    this.ticker.lastPrice = price;
    this.calculateIndicators();
  }

  private updateCandle(price: number, volume: number) {
    if (this.candles.length === 0) return;
    const lastCandle = this.candles[this.candles.length - 1];
    const intervalMap: any = { 
        '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000,
        '1H': 3600000, '4H': 14400000, '12H': 43200000, '1D': 86400000,
        '3D': 259200000, '1W': 604800000, '1M': 2592000000, '1Y': 31536000000
    };
    const interval = intervalMap[this.timeframe] || 60000;
    const now = Date.now();
    const lastCandleEnd = lastCandle.time + interval;

    if (now < lastCandleEnd) {
        lastCandle.close = price;
        lastCandle.high = Math.max(lastCandle.high, price);
        lastCandle.low = Math.min(lastCandle.low, price);
        lastCandle.volume += volume;
    } else {
        const newTime = lastCandle.time + interval;
        this.candles.push({
            time: newTime, open: price, high: price, low: price, close: price, volume: volume
        });
        if (this.candles.length > 500) this.candles.shift();
    }
  }

  private calculateIndicators() {
    const c = this.candles;
    if (c.length < 30) return;
    const closes = c.map(x => x.close);
    const highs = c.map(x => x.high);
    const lows = c.map(x => x.low);
    const volumes = c.map(x => x.volume);
    const len = closes.length;
    const lastIdx = len - 1;

    this.indicators.rsi = this.calcRSI(closes, 14);
    this.indicators.sma20 = this.calcSMA(closes, 20);
    this.indicators.ema20 = this.calcEMA(closes, 20);
    
    const ema12 = this.calcEMAArray(closes, 12);
    const ema26 = this.calcEMAArray(closes, 26);
    const macdLine = ema12[lastIdx] - ema26[lastIdx];
    const macdHistory = ema12.map((e, i) => e - ema26[i]);
    const signalLine = this.calcEMAArray(macdHistory, 9)[lastIdx];
    this.indicators.macd = { value: macdLine, signal: signalLine, histogram: macdLine - signalLine };

    const stdDev = this.calcStdDev(closes, 20);
    this.indicators.bollinger = { upper: this.indicators.sma20 + (stdDev * 2), middle: this.indicators.sma20, lower: this.indicators.sma20 - (stdDev * 2) };
    
    const volatility = (highs[lastIdx] - lows[lastIdx]) / closes[lastIdx];
    let mIndex = 50 + (Math.log10(volumes[lastIdx] + 1) * 5) - (volatility * 1000);
    this.indicators.metalIndex = Math.max(0, Math.min(100, mIndex));
  }

  private calcSMA(data: number[], period: number) { return data.length < period ? 0 : data.slice(-period).reduce((a, b) => a + b, 0) / period; }
  private calcEMA(data: number[], period: number) { const k = 2/(period+1); let ema=data[0]; for(let i=1;i<data.length;i++) ema = (data[i]*k) + (ema*(1-k)); return ema; }
  private calcEMAArray(data: number[], period: number) { const k = 2/(period+1); const r=[data[0]]; for(let i=1;i<data.length;i++) r.push((data[i]*k)+(r[i-1]*(1-k))); return r; }
  private calcRSI(data: number[], period: number) { if (data.length<period+1) return 50; let g=0,l=0; for(let i=data.length-period; i<data.length;i++) { const d=data[i]-data[i-1]; if(d>=0)g+=d; else l-=d; } if(l===0)return 100; return 100-(100/(1+((g/period)/(l/period)))); }
  private calcStdDev(data: number[], period: number) { if(data.length<period)return 0; const s=data.slice(-period), m=s.reduce((a,b)=>a+b,0)/period; return Math.sqrt(s.map(v=>Math.pow(v-m,2)).reduce((a,b)=>a+b,0)/period); }

  public async placeOrder(side: OrderSide, type: OrderType, amount: number, price: number, leverage: number = 1, sl?: number, tp?: number) {
    const p = type === OrderType.MARKET ? this.ticker.lastPrice : price;
    
    if (this.mode !== TradingMode.DEMO) {
        // REAL EXECUTION
        try {
            const payload = {
                symbol: this.currentPair,
                side: side.toUpperCase(),
                type: type.toUpperCase(),
                quantity: amount,
                price: p,
                leverage: this.mode === TradingMode.FUTURES ? leverage : undefined,
                stopLoss: sl,
                takeProfit: tp,
                timestamp: Date.now()
            };

            const response = await fetch(`${REAL_API_BASE}/order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${AUTH_TOKEN}` // In a full app, handle auth
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Order Failed: ${response.statusText}`);
            }

            const result = await response.json();
            // Ideally, the WebSocket stream will send the new order back to us.
            // But we can optimistically add it here if the API returns the order object.
            if (result && result.orderId) {
                 this.userOrders.unshift({
                    id: result.orderId,
                    symbol: this.currentPair, side, type, price: p,
                    originalAmount: amount, filledAmount: 0, remainingAmount: amount,
                    status: OrderStatus.OPEN, timestamp: Date.now(), leverage
                });
            }
        } catch (error: any) {
            console.error("Real Trade Error:", error);
            throw new Error(error.message || "Failed to execute real order");
        }
        return;
    }

    // DEMO LOGIC (Simulation)
    if (type === OrderType.MARKET) {
        const filledOrder: UserTrade = {
            id: Math.random().toString(),
            symbol: this.currentPair,
            side,
            price: p,
            amount: amount,
            fee: (p * amount) * FEE_RATE,
            role: 'taker',
            timestamp: Date.now()
        };
        this.userTradeHistory.unshift(filledOrder);

    } else {
        // Limit Order
        this.userOrders.unshift({
            id: Math.random().toString(),
            symbol: this.currentPair, side, type, price: p,
            originalAmount: amount, filledAmount: 0, remainingAmount: amount,
            status: OrderStatus.OPEN, timestamp: Date.now(), leverage
        });
    }
    this.notify();
  }
  
  public async cancelOrder(id: string) {
      if (this.mode !== TradingMode.DEMO) {
          try {
              const res = await fetch(`${REAL_API_BASE}/order?id=${id}`, { method: 'DELETE' });
              if (!res.ok) throw new Error("Failed to cancel");
              // Success, remove locally or wait for WS
              this.userOrders = this.userOrders.filter(o => o.id !== id);
          } catch (e) {
              console.error(e);
              throw e;
          }
      } else {
          this.userOrders = this.userOrders.filter(o => o.id !== id);
      }
      this.notify(); 
  }
  
  public async closePosition(id: string, amt: number) { 
      const pos = this.positions.find(p => p.id === id);
      if (pos) {
          if (this.mode !== TradingMode.DEMO) {
               // REAL EXECUTION: Send a market order in opposite direction to close
               const side = pos.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
               await this.placeOrder(side, OrderType.MARKET, amt, 0);
               // We assume the API/WS will update the position list. 
               // But to be responsive in UI for this example:
               this.positions = this.positions.filter(p => p.id !== id);
          } else {
            // DEMO
            const exitPrice = this.ticker.lastPrice;
            const details = this.calculatePositionExit(pos, amt, exitPrice);
            
            this.userTradeHistory.unshift({
                id: Math.random().toString(),
                symbol: pos.symbol,
                side: pos.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
                price: exitPrice,
                amount: amt,
                fee: details.fee,
                role: 'taker',
                timestamp: Date.now(),
                pnl: details.netPnl
            });

            this.positions = this.positions.filter(p => p.id !== id); 
          }
          this.notify(); 
      }
  }

  private updatePositions() {
     const price = this.ticker.lastPrice;
     if (!price) return;
     
     let changed = false;
     this.positions.forEach(p => {
         if (p.symbol === this.currentPair) { // Only update for current pair ticker if using single stream
             const val = p.amount * price;
             const entry = p.amount * p.entryPrice;
             const prevPnl = p.unrealizedPnl;
             p.unrealizedPnl = p.side === OrderSide.BUY ? val - entry : entry - val;
             p.pnlPercent = (p.unrealizedPnl / p.margin) * 100;
             
             if (prevPnl !== p.unrealizedPnl) changed = true;
         }
     });
     // Note: If we have positions in other pairs, we'd need their tickers too. 
     // For this demo, we assume active pair is the main source of truth.
  }

  private initializeWallet() {
    this.wallet.set('NVR', { currency: 'NVR', total: 100000, available: 100000, locked: 0 });
    this.wallet.set('AMR', { currency: 'AMR', total: 50, available: 50, locked: 0 });
    this.wallet.set('IONX', { currency: 'IONX', total: 2000, available: 2000, locked: 0 });
  }
  private getEmptyTicker(): Ticker { return { symbol: '', lastPrice: 0, priceChangePercent: 0, high24h: 0, low24h: 0, volume24h: 0 }; }
  private getEmptyBook(): OrderBookState { return { bids: [], asks: [], lastPrice: 0, spread: 0, maxDepth: 1 }; }
  private getEmptyIndicators(): TechnicalIndicators { return { rsi: 0, sma20: 0, ema20: 0, macd: { value: 0, signal: 0, histogram: 0 }, bollinger: { upper: 0, middle: 0, lower: 0 }, stoch: { k: 0, d: 0 }, atr: 0, cci: 0, williamsR: 0, momentum: 0, metalIndex: 0 }; }
}

export const marketService = new MarketService();
