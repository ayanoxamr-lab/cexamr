

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderType {
  LIMIT = 'limit',
  MARKET = 'market'
}

export enum OrderStatus {
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled'
}

export enum TradingMode {
  SPOT = 'spot',
  FUTURES = 'futures',
  DEMO = 'demo'
}

export type PairSymbol = 'AMR/NVR' | 'IONX/NVR' | 'AMR/IONX';

export interface MarketPairConfig {
  symbol: PairSymbol;
  base: string;
  quote: string;
  minAmount: number;
  priceDecimals: number;
  amountDecimals: number;
}

export interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
  cumulativeTotal: number;
}

export interface OrderBookState {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  lastPrice: number;
  spread: number;
  maxDepth: number;
}

export interface Trade {
  id: string;
  price: number;
  amount: number;
  side: OrderSide;
  timestamp: number;
}

export interface UserTrade {
  id: string;
  symbol: string;
  side: OrderSide;
  price: number;
  amount: number;
  fee: number;
  role: 'taker' | 'maker';
  timestamp: number;
  pnl?: number; // For closed positions
}

export interface Ticker {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WalletAsset {
  currency: string;
  total: number;
  available: number;
  locked: number;
}

export interface DigitalMetal {
  symbol: string;
  name: string;
  type: string;
  price: number;
  change24h: number;
  purity: string;
  backedBy: string;
  holdings: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  originalAmount: number;
  filledAmount: number;
  remainingAmount: number;
  status: OrderStatus;
  timestamp: number;
  leverage?: number; // For Futures
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide; // Buy = Long, Sell = Short
  entryPrice: number;
  amount: number;
  leverage: number;
  margin: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  pnlPercent: number;
  timestamp: number;
  sl?: number; // Stop Loss
  tp?: number; // Take Profit
}

// --- NEW TYPES FOR CHARTING & INDICATORS ---

export type IndicatorType = 
  | 'rsi' 
  | 'sma' 
  | 'ema' 
  | 'macd' 
  | 'bollinger' 
  | 'stoch' 
  | 'atr' 
  | 'cci' 
  | 'williamsR' 
  | 'momentum' 
  | 'metalIndex'
  | 'volumeProfile'
  | 'vwap';

export interface TechnicalIndicators {
  rsi: number;         // Relative Strength Index (14)
  sma20: number;       // Simple Moving Average (20)
  ema20: number;       // Exponential Moving Average (20)
  macd: {              // Moving Average Convergence Divergence
    value: number;
    signal: number;
    histogram: number;
  };
  bollinger: {         // Bollinger Bands (20, 2)
    upper: number;
    middle: number;
    lower: number;
  };
  stoch: {             // Stochastic Oscillator (14, 3, 3)
    k: number;
    d: number;
  };
  atr: number;         // Average True Range (14)
  cci: number;         // Commodity Channel Index (20)
  williamsR: number;   // Williams %R (14)
  momentum: number;    // Momentum (10)
  metalIndex: number;  // Proprietary Metal Reserves Index (0-100)
}

export interface DrawingObject {
  id: string;
  type: 'trendline' | 'ray' | 'horizontal' | 'fib' | 'rect' | 'channel';
  p1: { time: number; price: number };
  p2: { time: number; price: number }; 
  color: string;
  locked: boolean;
}

export interface MarketAnalysis {
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  summary: string;
  timestamp: number;
}

export interface Robot {
  id: string;
  name: string;
  description: string;
  active: boolean;
  pnl: number; // Total Profit/Loss
  pnlPercent: number;
  strategy: 'scalp' | 'grid' | 'arbitrage' | 'ai_sentiment';
  pair: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AIAnalysisResult {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  keyLevels: { support: number; resistance: number };
  timestamp: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  active: boolean;
  createdAt: number;
}

export interface P2PAd {
  id: string;
  advertiser: {
    name: string;
    verified: boolean;
    orders: number;
    completion: number;
  };
  price: number;
  currency: string;
  asset: string;
  available: number;
  limit: { min: number; max: number };
  paymentMethods: string[];
  type: 'buy' | 'sell';
}

export type AppTheme = 'official' | 'female' | 'male';