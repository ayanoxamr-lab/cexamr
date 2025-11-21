
import React, { useState, useEffect, useRef } from 'react';
import { Zap, ArrowDown, ArrowUp, ChevronDown, Activity, Layers, Settings, Search, Bot, Wallet, TrendingUp, AlertCircle, X, Pause, Play, BarChart3, Database, PenTool, Eye, EyeOff, RefreshCw, Minus, MoveRight, Slash, Send, Mic, MicOff, Cpu, Volume2, Trash2, AlertTriangle, CheckCircle2, ShieldCheck, Fingerprint, Lock, FileText, ScanLine, Check, UploadCloud, Camera, Smartphone, UserCheck, Bell, BellRing, CreditCard, Link as LinkIcon, Copy, ExternalLink, User, QrCode, History, ArrowLeftRight, Gem, Coins, Hexagon, Triangle, BoxSelect, Percent, RectangleHorizontal, Menu, Home, BarChart2, List, Palette, Maximize2, Move } from 'lucide-react';
import { GoogleGenAI, Chat, GenerateContentResponse, LiveServerMessage, Modality, Type, Blob } from "@google/genai";
import ChartCanvas from './components/ChartCanvas';
import { marketService, PAIRS, TIMEFRAMES } from './services/marketService';
import { TradingMode, PairSymbol, OrderSide, OrderType, IndicatorType, DrawingObject, Position, ChatMessage, AIAnalysisResult, PriceAlert, P2PAd, DigitalMetal, AppTheme } from './types';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success'|'error'|'warning', onClose: () => void }) => (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border animate-slide-in min-w-[300px] ${type === 'success' ? 'bg-bg-panel border-accent-success/50 text-accent-success' : type === 'warning' ? 'bg-bg-panel border-accent-warning/50 text-accent-warning' : 'bg-bg-panel border-accent-danger/50 text-accent-danger'}`}>
        {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : type === 'warning' ? <BellRing className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        <span className="font-bold text-sm text-white">{message}</span>
        <button onClick={onClose} className="ml-auto"><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
    </div>
);

// Mobile Bottom Navigation
const MobileBottomNav = ({ view, setView }: { view: string, setView: (v: 'trade' | 'metals' | 'p2p') => void }) => (
    <div className="lg:hidden fixed bottom-0 left-0 w-full bg-bg-panel/95 backdrop-blur-md border-t border-border-soft flex justify-around items-center py-2 pb-safe z-50">
        <button onClick={() => setView('trade')} className={`flex flex-col items-center gap-1 p-2 ${view === 'trade' ? 'text-accent-primary' : 'text-slate-500'}`}>
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] font-bold">Trade</span>
        </button>
        <button onClick={() => setView('metals')} className={`flex flex-col items-center gap-1 p-2 ${view === 'metals' ? 'text-accent-primary' : 'text-slate-500'}`}>
            <Gem className="w-5 h-5" />
            <span className="text-[10px] font-bold">Metals</span>
        </button>
        <button onClick={() => setView('p2p')} className={`flex flex-col items-center gap-1 p-2 ${view === 'p2p' ? 'text-accent-primary' : 'text-slate-500'}`}>
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] font-bold">P2P</span>
        </button>
    </div>
);

// --- NEW SUB-COMPONENTS FOR P2P & METALS ---

const MetalsView = ({ onClose }: { onClose: () => void }) => {
    const [connected, setConnected] = useState(false);
    const [loadingWeb3, setLoadingWeb3] = useState(false);
    const [selectedMetal, setSelectedMetal] = useState<string | null>(null);
    const [buyAmount, setBuyAmount] = useState('');

    const connectWallet = () => {
        setLoadingWeb3(true);
        setTimeout(() => {
            setConnected(true);
            setLoadingWeb3(false);
        }, 1500);
    };

    const metals: DigitalMetal[] = [
        { symbol: 'LXR', name: 'Lexereum', type: 'Lexereum', price: 500, change24h: 4.2, purity: 'Standard Protocol', backedBy: 'Blockchain Ledger', holdings: connected ? 100 : 0 },
        { symbol: 'GLD', name: 'Gold', type: 'Gold', price: 1000, change24h: 0.8, purity: '99.99% Fine Gold', backedBy: 'London Vaults', holdings: connected ? 5 : 0 },
        { symbol: 'DMD', name: 'Diamond', type: 'Diamond', price: 1000000, change24h: 1.5, purity: 'Type IIa / Flawless', backedBy: 'GIA Certified', holdings: 0 },
        { symbol: 'CRYS', name: 'Crystal', type: 'Crystal', price: 50000, change24h: -1.2, purity: 'Rare Earth Prism', backedBy: 'Mineral Reserves', holdings: 0 },
        { symbol: 'DMS', name: 'Dark Matter Shard', type: 'DarkMatter', price: 10000, change24h: 12.4, purity: 'Exotic Matter', backedBy: 'Cosmic Labs', holdings: connected ? 1 : 0 },
    ];

    const getMetalIcon = (type: string) => {
        switch (type) {
            case 'Lexereum': return <Cpu className="w-5 h-5" />;
            case 'Gold': return <Coins className="w-5 h-5" />;
            case 'Diamond': return <Gem className="w-5 h-5" />;
            case 'Crystal': return <Hexagon className="w-5 h-5" />;
            case 'DarkMatter': return <Triangle className="w-5 h-5" />;
            default: return <Gem className="w-5 h-5" />;
        }
    };

    const getMetalColor = (type: string) => {
        switch (type) {
            case 'Lexereum': return 'bg-indigo-600';
            case 'Gold': return 'bg-amber-500';
            case 'Diamond': return 'bg-cyan-400 text-black';
            case 'Crystal': return 'bg-purple-500';
            case 'DarkMatter': return 'bg-slate-800 border border-white/20';
            default: return 'bg-blue-600';
        }
    };

    const totalValue = metals.reduce((acc, m) => acc + (m.holdings * m.price), 0);

    return (
        <div className="flex-1 bg-bg-main overflow-y-auto custom-scrollbar p-4 pb-24 md:p-6 animate-fade-in">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* RWA Header Card */}
                <div className="bg-gradient-to-r from-[#1e1b4b] to-[#312e81] border border-indigo-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(79,70,229,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -ml-5 -mb-5"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-indigo-200 text-sm font-bold">
                                <Gem className="w-4 h-4" /> Digital Assets (RWA)
                            </div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h1 className="text-3xl md:text-4xl font-mono font-bold text-white">
                                    ${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </h1>
                                <span className="text-sm text-indigo-300">Total Asset Value</span>
                            </div>
                            <p className="text-xs text-indigo-400 max-w-md mt-2 hidden md:block">
                                Securely trade high-value tokenized assets. From digital currencies like Lexereum to rare earth Crystals and exotic Dark Matter.
                            </p>
                        </div>

                        {/* Web3 Connect for Metals */}
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                            <button 
                                onClick={connectWallet} 
                                disabled={connected}
                                className={`w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border ${connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-indigo-500'}`}
                            >
                                {loadingWeb3 ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : connected ? (
                                    <>
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        Vault Connected
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4" /> Connect On-Chain
                                    </>
                                )}
                            </button>
                            <span className="text-[10px] text-indigo-300 flex items-center gap-1">
                                {connected ? <Lock className="w-3 h-3"/> : <GlobeIcon/>}
                                {connected ? 'Assets Verified On-Chain' : 'Connect to view holdings'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Market Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {metals.map((metal) => (
                        <div key={metal.symbol} className="bg-bg-panel border border-border-soft hover:border-indigo-500/50 transition-all rounded-xl p-5 group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner border border-white/10 ${getMetalColor(metal.type)}`}>
                                        {getMetalIcon(metal.type)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{metal.name}</div>
                                        <div className="text-[10px] text-slate-400">{metal.symbol}</div>
                                    </div>
                                </div>
                                <div className={`text-xs font-bold ${metal.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {metal.change24h > 0 ? '+' : ''}{metal.change24h}%
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <div className="text-xl font-mono font-bold text-white">${metal.price.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500">per unit</div>
                            </div>

                            <div className="bg-bg-deep p-2 rounded mb-4 border border-border-soft/30">
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>Holdings</span>
                                    <span className="text-white font-mono">{metal.holdings} {metal.symbol}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>Purity</span>
                                    <span className="text-indigo-300">{metal.purity}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <button 
                                    onClick={() => setSelectedMetal(metal.symbol)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded text-xs font-bold transition-colors"
                                >
                                    Buy
                                </button>
                                <button className="flex-1 bg-white/5 hover:bg-white/10 border border-border-soft text-white py-2 rounded text-xs font-bold transition-colors">
                                    Sell
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Metal Purchase Modal (Simple Simulation) */}
                {selectedMetal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
                        <div className="w-full max-w-md bg-bg-panel border border-indigo-500/30 rounded-xl shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Gem className="w-4 h-4 text-amber-500" /> Buy {selectedMetal}
                                </h3>
                                <button onClick={() => setSelectedMetal(null)}><X className="w-4 h-4 text-slate-500 hover:text-white"/></button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Amount (USD)</label>
                                    <div className="flex items-center gap-2 bg-bg-deep border border-border-soft rounded p-2">
                                        <span className="text-slate-500 text-sm">$</span>
                                        <input 
                                            type="number" 
                                            className="bg-transparent w-full outline-none text-white font-mono"
                                            placeholder="1000"
                                            value={buyAmount}
                                            onChange={e => setBuyAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-center">
                                    <ArrowDown className="w-4 h-4 text-slate-500" />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Receive ({selectedMetal})</label>
                                    <div className="bg-bg-deep border border-border-soft rounded p-2">
                                        <span className="text-white font-mono">
                                            {buyAmount ? (parseFloat(buyAmount) / (metals.find(m => m.symbol === selectedMetal)?.price || 1)).toFixed(4) : '0.0000'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-[10px] text-slate-500 flex items-center gap-1 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                                    <Activity className="w-3 h-3 text-blue-400" />
                                    Smart Routing: Best price from Global Liquidity Pools.
                                </div>

                                <button 
                                    onClick={() => { setSelectedMetal(null); setBuyAmount(''); }}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Confirm Purchase (On-Chain)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Informational Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="p-4 rounded-lg bg-bg-panel border border-border-soft/50 flex flex-col gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        <h4 className="text-white font-bold text-sm">Verified Authenticity</h4>
                        <p className="text-xs text-slate-400">All assets are verified via ZK-Proofs and physical auditing where applicable.</p>
                    </div>
                    <div className="p-4 rounded-lg bg-bg-panel border border-border-soft/50 flex flex-col gap-2">
                        <RefreshCw className="w-6 h-6 text-blue-400" />
                        <h4 className="text-white font-bold text-sm">Instant Settlement</h4>
                        <p className="text-xs text-slate-400">Trade high-value assets 24/7 with instant settlement on the blockchain.</p>
                    </div>
                    <div className="p-4 rounded-lg bg-bg-panel border border-border-soft/50 flex flex-col gap-2">
                        <ScanLine className="w-6 h-6 text-amber-400" />
                        <h4 className="text-white font-bold text-sm">Secure Storage</h4>
                        <p className="text-xs text-slate-400">Underlying physical assets are stored in insured, military-grade vaults.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

function GlobeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    )
}


const P2PView = () => {
    const [type, setType] = useState<'buy'|'sell'>('buy');
    const [asset, setAsset] = useState('USDT');

    const mockAds: P2PAd[] = [
        { id: '1', advertiser: { name: 'CosmicTrader_99', verified: true, orders: 1450, completion: 99.2 }, price: 1.002, currency: 'USD', asset: 'USDT', available: 5400, limit: { min: 100, max: 5000 }, paymentMethods: ['Bank Transfer', 'Wise'], type: 'sell' },
        { id: '2', advertiser: { name: 'FastCryptoHub', verified: false, orders: 320, completion: 95.5 }, price: 1.005, currency: 'USD', asset: 'USDT', available: 1200, limit: { min: 50, max: 1000 }, paymentMethods: ['PayPal', 'Revolut'], type: 'sell' },
        { id: '3', advertiser: { name: 'StellarMerchant', verified: true, orders: 5600, completion: 99.9 }, price: 0.998, currency: 'USD', asset: 'USDT', available: 15000, limit: { min: 1000, max: 10000 }, paymentMethods: ['Bank Transfer'], type: 'buy' },
    ];

    const ads = mockAds.filter(a => a.type === (type === 'buy' ? 'sell' : 'buy')); // Logic flip: If I want to BUY, I look at SELL ads

    return (
        <div className="flex-1 bg-bg-main overflow-y-auto custom-scrollbar p-4 pb-24 md:p-6 animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* P2P Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto">
                        <div className="flex bg-bg-deep rounded-lg p-1 border border-border-soft shrink-0">
                            <button 
                                onClick={() => setType('buy')} 
                                className={`px-6 py-2 rounded font-bold text-sm transition-all ${type === 'buy' ? 'bg-accent-success text-white shadow-lg shadow-accent-success/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                Buy
                            </button>
                            <button 
                                onClick={() => setType('sell')} 
                                className={`px-6 py-2 rounded font-bold text-sm transition-all ${type === 'sell' ? 'bg-accent-danger text-white shadow-lg shadow-accent-danger/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                Sell
                            </button>
                        </div>
                        <div className="h-8 w-px bg-border-soft shrink-0"></div>
                        <div className="flex gap-2 shrink-0">
                            {['USDT', 'BTC', 'ETH'].map(c => (
                                <button key={c} onClick={() => setAsset(c)} className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${asset === c ? 'border-accent-primary text-accent-primary bg-accent-primary/5' : 'border-transparent text-slate-500 hover:bg-white/5'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-panel border border-border-soft text-xs font-bold text-white hover:border-accent-primary transition-colors whitespace-nowrap">
                            <Settings className="w-4 h-4" /> Payment Methods
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-panel border border-border-soft text-xs font-bold text-white hover:border-accent-primary transition-colors whitespace-nowrap">
                            <History className="w-4 h-4" /> Orders
                        </button>
                    </div>
                </div>

                {/* P2P Table */}
                <div className="bg-bg-panel border border-border-soft rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-bg-deep text-xs text-slate-500 border-b border-border-soft">
                                <tr>
                                    <th className="px-6 py-4">Advertiser</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Limit / Available</th>
                                    <th className="px-6 py-4">Payment</th>
                                    <th className="px-6 py-4 text-right">Trade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-soft/50">
                                {ads.map((ad) => (
                                    <tr key={ad.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-white hover:text-accent-primary cursor-pointer">{ad.advertiser.name}</span>
                                                    {ad.advertiser.verified && <CheckCircle2 className="w-3.5 h-3.5 text-accent-secondary" fill="currentColor" stroke="black" />}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {ad.advertiser.orders} orders | {ad.advertiser.completion}% completion
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={`text-lg font-mono font-bold ${type === 'buy' ? 'text-accent-success' : 'text-accent-danger'}`}>
                                                    {ad.price.toFixed(3)} <span className="text-xs text-slate-500 font-sans">{ad.currency}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs space-y-1">
                                                <div className="flex gap-2 text-slate-400">
                                                    <span>Available</span>
                                                    <span className="text-white font-bold">{ad.available.toLocaleString()} {ad.asset}</span>
                                                </div>
                                                <div className="flex gap-2 text-slate-400">
                                                    <span>Limit</span>
                                                    <span className="text-white">{ad.limit.min.toLocaleString()} - {ad.limit.max.toLocaleString()} {ad.currency}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {ad.paymentMethods.map(pm => (
                                                    <span key={pm} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/5">
                                                        {pm}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className={`px-6 py-2 rounded font-bold text-sm shadow-lg transition-all ${type === 'buy' ? 'bg-accent-success hover:bg-emerald-500 text-white shadow-accent-success/20' : 'bg-accent-danger hover:bg-red-500 text-white shadow-accent-danger/20'}`}>
                                                {type === 'buy' ? 'Buy' : 'Sell'} {ad.asset}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  // Main View State
  const [view, setView] = useState<'trade' | 'metals' | 'p2p'>('trade');
  
  // Theme State
  const [theme, setTheme] = useState<AppTheme>(() => {
      const saved = localStorage.getItem('aynu_theme');
      return (saved as AppTheme) || 'official';
  });

  const [showThemeMenu, setShowThemeMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem('aynu_theme', theme);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const [mode, setMode] = useState<TradingMode>(TradingMode.SPOT);
  const [data, setData] = useState(marketService.getData());
  
  const [orderSide, setOrderSide] = useState<OrderSide>(OrderSide.BUY);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.LIMIT);
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  
  // Leverage State
  const [leverage, setLeverage] = useState<number>(10);
  const [showLeverageWarn, setShowLeverageWarn] = useState(false);

  const [sl, setSl] = useState<string>(''); 
  const [tp, setTp] = useState<string>(''); 
  
  const [activeTab, setActiveTab] = useState<'orders' | 'positions' | 'history' | 'analysis'>('orders');
  const [leftTab, setLeftTab] = useState<'markets' | 'robots'>('markets');
  const [rightTab, setRightTab] = useState<'book' | 'trades'>('book'); 
  
  // Mobile Tab State
  const [mobileTradeTab, setMobileTradeTab] = useState<'chart' | 'form' | 'book' | 'orders'>('chart');

  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(['rsi', 'volumeProfile', 'vwap']);
  const [showIndMenu, setShowIndMenu] = useState(false);
  const [drawMode, setDrawMode] = useState<'none' | 'trendline' | 'ray' | 'horizontal' | 'fib' | 'rect' | 'channel'>('none');
  const [drawColor, setDrawColor] = useState('#eab308');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  
  const [closeModal, setCloseModal] = useState<{id: string, symbol: string, amount: number, max: number, position: Position} | null>(null);
  const [exitDetails, setExitDetails] = useState<{exitValue: number, fee: number, grossPnl: number, netPnl: number} | null>(null);
  
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'warning'} | null>(null);

  // AI Analysis State
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Chat & Voice State
  const [showAi, setShowAi] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [activeAudioSources, setActiveAudioSources] = useState(0);
  const isAiSpeaking = activeAudioSources > 0;
  
  // ZK-KYC State
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycStep, setKycStep] = useState<'upload' | 'face' | 'processing' | 'verified'>('upload');
  const [kycFiles, setKycFiles] = useState<{front: boolean, back: boolean}>({front: false, back: false});
  const [zkProof, setZkProof] = useState<string | null>(null);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  // PRICE ALERTS STATE
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlertPrice, setNewAlertPrice] = useState('');
  
  // Transcription State
  const [liveTranscript, setLiveTranscript] = useState({ user: '', model: '' });

  // Mobile Responsive Handling
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Chat Window State
  const [chatBox, setChatBox] = useState({
      x: isMobile ? 0 : window.innerWidth - 340, // Positioned closer to right
      y: isMobile ? 0 : 100,
      w: isMobile ? window.innerWidth : 300, // Much smaller width (vertical chat widget)
      h: isMobile ? window.innerHeight : 420, // Reasonable height
      minimized: false
  });
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Live API Refs
  const liveClientRef = useRef<GoogleGenAI | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());


  useEffect(() => {
      const handleResize = () => {
          const mobile = window.innerWidth < 1024;
          setIsMobile(mobile);
          if (mobile) {
              setChatBox(prev => ({ ...prev, x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }));
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Drag & Resize
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isDraggingRef.current && !chatBox.minimized && !isMobile) {
              setChatBox(prev => ({
                  ...prev,
                  x: Math.max(0, Math.min(window.innerWidth - prev.w, e.clientX - dragOffset.current.x)),
                  y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y))
              }));
          }
          if (isResizingRef.current && !chatBox.minimized && !isMobile) {
              setChatBox(prev => ({
                  ...prev,
                  w: Math.max(300, e.clientX - prev.x),
                  h: Math.max(300, e.clientY - prev.y)
              }));
          }
      };
      const handleMouseUp = () => {
          isDraggingRef.current = false;
          isResizingRef.current = false;
          document.body.style.cursor = 'default';
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [chatBox.minimized, isMobile]);

  const startDrag = (e: React.MouseEvent) => {
      if (isMobile || chatBox.minimized) return;
      isDraggingRef.current = true;
      dragOffset.current = { x: e.clientX - chatBox.x, y: e.clientY - chatBox.y };
  };

  const startResize = (e: React.MouseEvent) => {
      if (isMobile || chatBox.minimized) return;
      e.stopPropagation();
      isResizingRef.current = true;
      document.body.style.cursor = 'nwse-resize';
  };

  useEffect(() => {
      const saved = localStorage.getItem('aynu_alerts');
      if (saved) {
          try { setAlerts(JSON.parse(saved)); } catch(e) { setAlerts([]); }
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('aynu_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
      const currentPrice = data.ticker.lastPrice;
      if (!currentPrice || alerts.length === 0) return;

      let updated = false;
      const newAlerts = alerts.map(a => {
          if (!a.active || a.symbol !== data.pair) return a;

          let triggered = false;
          if (a.condition === 'above' && currentPrice >= a.targetPrice) triggered = true;
          if (a.condition === 'below' && currentPrice <= a.targetPrice) triggered = true;

          if (triggered) {
              setToast({ msg: `🔔 Price Alert: ${a.symbol} reached ${a.targetPrice}`, type: 'warning' });
              updated = true;
              return { ...a, active: false }; 
          }
          return a;
      });

      if (updated) setAlerts(newAlerts);
  }, [data.ticker.lastPrice, data.pair]); 

  useEffect(() => {
    const unsub = marketService.subscribe(() => {
      setData(marketService.getData());
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (mode === TradingMode.FUTURES) setActiveTab('positions');
    else setActiveTab('orders');
  }, [mode]);

  useEffect(() => {
      if (data.ticker.lastPrice > 0 && !price && orderType === OrderType.LIMIT) {
          setPrice(data.ticker.lastPrice.toFixed(data.ticker.lastPrice > 100 ? 2 : 4));
      }
  }, [data.pair, orderType]); 

  useEffect(() => {
      if (mode === TradingMode.FUTURES && leverage > 20) {
          setShowLeverageWarn(true);
      } else {
          setShowLeverageWarn(false);
      }
  }, [leverage, mode]);

  useEffect(() => {
      const saved = localStorage.getItem(`aynu_drawings_${data.pair}`);
      if (saved) {
          try { setDrawings(JSON.parse(saved)); } catch (e) { setDrawings([]); }
      } else {
          setDrawings([]);
      }
  }, [data.pair]);

  useEffect(() => {
      if (data.pair) {
          localStorage.setItem(`aynu_drawings_${data.pair}`, JSON.stringify(drawings));
      }
  }, [drawings, data.pair]);

  useEffect(() => {
      if (closeModal && closeModal.position) {
          const amt = closeModal.amount || 0;
          const details = marketService.calculatePositionExit(closeModal.position, amt, data.ticker.lastPrice);
          setExitDetails(details);
      }
  }, [closeModal?.amount, data.ticker.lastPrice]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, liveTranscript, chatBox.minimized]);

  useEffect(() => {
      if(toast) {
          const t = setTimeout(() => setToast(null), 3000);
          return () => clearTimeout(t);
      }
  }, [toast]);

  const handlePairChange = (pair: PairSymbol) => {
    marketService.setPair(pair);
    setMobileTradeTab('chart'); // Reset to chart on pair change
  };

  const handleModeChange = (m: TradingMode) => {
    setMode(m);
    marketService.setMode(m);
  };

  const handleTimeframeChange = (tf: string) => {
      marketService.setTimeframe(tf);
  };

  const toggleIndicator = (ind: IndicatorType) => {
      setActiveIndicators(prev => 
          prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
      );
  };

  const handleOrder = async () => {
    const p = parseFloat(price);
    const a = parseFloat(amount);
    const s = sl ? parseFloat(sl) : undefined;
    const t = tp ? parseFloat(tp) : undefined;

    if (isNaN(a) || a <= 0) {
        setToast({msg: 'Invalid Amount', type: 'error'});
        return;
    }
    if (orderType !== OrderType.MARKET && (isNaN(p) || p <= 0)) {
        setToast({msg: 'Invalid Price', type: 'error'});
        return;
    }
    
    try {
      await marketService.placeOrder(
          orderSide, 
          orderType, 
          a, 
          orderType === OrderType.MARKET ? 0 : p, 
          mode === TradingMode.FUTURES ? leverage : 1,
          s,
          t
      );
      setToast({msg: `${orderSide.toUpperCase()} Order Placed Successfully`, type: 'success'});
      setAmount('');
    } catch (e: any) {
      setToast({msg: e.message, type: 'error'});
    }
  };

  const handleClosePosition = async () => {
      if (!closeModal) return;
      const val = parseFloat(closeModal.amount.toString());
      if (isNaN(val) || val <= 0 || val > closeModal.max) return;
      
      try {
          await marketService.closePosition(closeModal.id, val);
          setCloseModal(null);
          setExitDetails(null);
          setToast({msg: 'Position Closed', type: 'success'});
      } catch (e: any) {
          setToast({msg: e.message, type: 'error'});
      }
  };

  const handleDeleteDrawing = (id: string) => {
      if (confirm("Delete this drawing?")) {
          setDrawings(prev => prev.filter(d => d.id !== id));
      }
  };

  const handleClearDrawings = () => {
      if (confirm("Clear all drawings for this pair?")) {
          setDrawings([]);
      }
  };

  const handleAddAlert = () => {
      const target = parseFloat(newAlertPrice);
      if (isNaN(target) || target <= 0) return;

      const current = data.ticker.lastPrice;
      const condition = target > current ? 'above' : 'below';

      const newAlert: PriceAlert = {
          id: Math.random().toString(),
          symbol: data.pair,
          targetPrice: target,
          condition,
          active: true,
          createdAt: Date.now()
      };

      setAlerts(prev => [...prev, newAlert]);
      setNewAlertPrice('');
      setToast({ msg: `Alert set for ${target}`, type: 'success' });
  };

  const handleDeleteAlert = (id: string) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleUploadId = (side: 'front' | 'back') => {
      setTimeout(() => {
          setKycFiles(prev => ({ ...prev, [side]: true }));
      }, 500);
  };

  const handleStartProcessing = () => {
      setKycStep('processing');
      const logs = [
          "Encrypting uploaded documents...",
          "Extracting OCR data...",
          "Verifying Document Validity...",
          "Verifying Age > 18 (Legal Compliance)...",
          "Analyzing Facial Geometry...",
          "Matching Biometrics to ID Photo...",
          "Liveness Check Passed.",
          "Generating Zero-Knowledge Proof (ZK-SNARK)...",
          "Verification Successful."
      ];
      
      let i = 0;
      setProcessingLogs([]);
      const interval = setInterval(() => {
          if (i >= logs.length) {
              clearInterval(interval);
              const fakeHash = "0xZK" + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
              setZkProof(fakeHash);
              setKycStep('verified');
          } else {
              setProcessingLogs(prev => [...prev, logs[i]]);
              i++;
          }
      }, 800);
  };

  const performSmartScan = async () => {
      if (!process.env.API_KEY) { setToast({msg: "API Key missing", type: 'error'}); return; }
      setIsAnalyzing(true);
      setShowAnalysis(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const context = marketService.getMarketContext();
          
          const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: `Analyze the following crypto market data and provide a strategic trading recommendation.
             Data: ${context}
             Provide the output in JSON format.`,
             config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                         recommendation: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
                         confidence: { type: Type.NUMBER },
                         reasoning: { type: Type.STRING },
                         keyLevels: {
                             type: Type.OBJECT,
                             properties: {
                                 support: { type: Type.NUMBER },
                                 resistance: { type: Type.NUMBER }
                             }
                         }
                     }
                 }
             }
          });
          
          const result = JSON.parse(response.text || "{}");
          setAnalysisResult({ ...result, timestamp: Date.now() });
      } catch (e) {
          console.error(e);
          setAnalysisResult(null);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const initChat = () => {
      if (!process.env.API_KEY) return;
      if (!chatSession.current) {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          chatSession.current = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: {
                  systemInstruction: `You are Aynu, an advanced market AI. 
                  Current Context: ${marketService.getMarketContext()}`
              }
          });
          setChatHistory([{ id: '0', role: 'model', text: `Hello! I am Aynu Market Brain. I'm analyzing ${data.pair} in real-time. How can I assist your trading today?`, timestamp: Date.now() }]);
      }
      setShowAi(true);
      if (!isMobile) {
         setChatBox(prev => ({ ...prev, minimized: false }));
      }
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || !chatSession.current) return;
      const msg = chatInput;
      setChatInput('');
      setChatHistory(prev => [...prev, { id: Math.random().toString(), role: 'user', text: msg, timestamp: Date.now() }]);
      setChatLoading(true);
      
      try {
          const contextMsg = `[Data Update: ${marketService.getMarketContext()}] ${msg}`;
          const response = await chatSession.current.sendMessage({ message: contextMsg });
          setChatHistory(prev => [...prev, { id: Math.random().toString(), role: 'model', text: response.text, timestamp: Date.now() }]);
      } catch (e) {
          setChatHistory(prev => [...prev, { id: Math.random().toString(), role: 'model', text: "Connection interrupted.", timestamp: Date.now() }]);
      }
      setChatLoading(false);
  };

  const toggleVoiceMode = async () => {
      if (isVoiceActive) {
          setIsVoiceActive(false);
          inputAudioContextRef.current?.close();
          outputAudioContextRef.current?.close();
          window.location.reload(); 
          return;
      }

      if (!process.env.API_KEY) { setToast({msg: "No API Key found", type: 'error'}); return; }
      
      try {
          setIsVoiceActive(true);
          setShowAi(true);
          if (!isMobile) setChatBox(prev => ({...prev, minimized: false}));
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          liveClientRef.current = ai;

          const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          inputAudioContextRef.current = inputAudioContext;
          outputAudioContextRef.current = outputAudioContext;

          const outputNode = outputAudioContext.createGain();
          outputNode.connect(outputAudioContext.destination);
          
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          const sessionPromise = ai.live.connect({
              model: 'gemini-2.5-flash-native-audio-preview-09-2025',
              callbacks: {
                  onopen: () => {
                      const source = inputAudioContext.createMediaStreamSource(stream);
                      const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                      scriptProcessor.onaudioprocess = (e) => {
                          const inputData = e.inputBuffer.getChannelData(0);
                          let sum = 0;
                          for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                          setVoiceVolume(Math.sqrt(sum/inputData.length) * 10);

                          const pcmBlob = createBlob(inputData);
                          sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                      };
                      source.connect(scriptProcessor);
                      scriptProcessor.connect(inputAudioContext.destination);
                  },
                  onmessage: async (msg: LiveServerMessage) => {
                      const inTr = msg.serverContent?.inputTranscription?.text;
                      const outTr = msg.serverContent?.outputTranscription?.text;
                      const turnComplete = msg.serverContent?.turnComplete;

                      if (inTr) setLiveTranscript(prev => ({ ...prev, user: prev.user + inTr }));
                      if (outTr) setLiveTranscript(prev => ({ ...prev, model: prev.model + outTr }));

                      if (turnComplete) {
                          setLiveTranscript((prev) => {
                              setChatHistory(h => {
                                  const newHistory = [...h];
                                  if (prev.user) newHistory.push({ id: Math.random().toString(), role: 'user', text: prev.user, timestamp: Date.now() });
                                  if (prev.model) newHistory.push({ id: Math.random().toString(), role: 'model', text: prev.model, timestamp: Date.now() });
                                  return newHistory;
                              });
                              return { user: '', model: '' };
                          });
                      }

                      const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                      if (base64Audio) {
                          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                          const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                          const source = outputAudioContext.createBufferSource();
                          source.buffer = audioBuffer;
                          source.connect(outputNode);
                          
                          source.onended = () => {
                              audioSourcesRef.current.delete(source);
                              setActiveAudioSources(prev => Math.max(0, prev - 1));
                          };
                          
                          source.start(nextStartTimeRef.current);
                          audioSourcesRef.current.add(source);
                          setActiveAudioSources(prev => prev + 1);

                          nextStartTimeRef.current += audioBuffer.duration;
                      }
                  },
                  onclose: () => setIsVoiceActive(false),
                  onerror: () => setIsVoiceActive(false)
              },
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                  inputAudioTranscription: { model: 'gemini-2.5-flash-native-audio-preview-09-2025' },
                  outputAudioTranscription: { model: 'gemini-2.5-flash-native-audio-preview-09-2025' },
                  systemInstruction: `You are Aynu, a crypto trading assistant. Answer briefly. Current Price is ${data.ticker.lastPrice}.`
              }
          });

      } catch (e) {
          console.error(e);
          setIsVoiceActive(false);
          setToast({msg: "Failed to start voice session", type: 'error'});
      }
  };

  function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  }
  function encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function decode(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, channels: number) {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(channels, dataInt16.length/channels, rate);
    for(let c=0; c<channels; c++) {
        const chData = buffer.getChannelData(c);
        for(let i=0; i<chData.length; i++) chData[i] = dataInt16[i*channels+c] / 32768.0;
    }
    return buffer;
  }
  
  const availableIndicators: {id: IndicatorType, label: string}[] = [
      { id: 'rsi', label: 'Relative Strength Index (RSI)' },
      { id: 'macd', label: 'MACD' },
      { id: 'bollinger', label: 'Bollinger Bands' },
      { id: 'sma', label: 'SMA (20)' },
      { id: 'ema', label: 'EMA (20)' },
      { id: 'vwap', label: 'VWAP (Session)' },
      { id: 'stoch', label: 'Stochastic' },
      { id: 'volumeProfile', label: 'Volume Profile (VPVR)' },
      { id: 'metalIndex', label: 'Metal Reserves (Proprietary)' }
  ];

  const maxBidVol = Math.max(...data.orderBook.bids.slice(0, 20).map(b => b.amount), 1);
  const maxAskVol = Math.max(...data.orderBook.asks.slice(0, 20).map(a => a.amount), 1);

  const activeAlertsCount = alerts.filter(a => a.active && a.symbol === data.pair).length;

  // Reusable Order Form Component
  const OrderForm = () => (
      <div className="w-full h-full flex flex-col gap-3 relative overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-2">
              <h3 className="text-white text-sm font-bold">Place Order</h3>
              <span className="text-[10px] text-slate-500 bg-bg-deep px-2 py-0.5 rounded border border-border-soft/50">{mode === TradingMode.FUTURES ? 'Cross' : 'Spot'}</span>
          </div>
          
          <div className="flex bg-bg-deep rounded p-1 mb-2">
              <button onClick={() => setOrderType(OrderType.LIMIT)} className={`flex-1 text-xs py-1 rounded font-bold ${orderType === OrderType.LIMIT ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Limit</button>
              <button onClick={() => setOrderType(OrderType.MARKET)} className={`flex-1 text-xs py-1 rounded font-bold ${orderType === OrderType.MARKET ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Market</button>
          </div>

          <div className="flex gap-2 mb-2">
              <button 
                  onClick={() => setOrderSide(OrderSide.BUY)} 
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all shadow-lg border border-transparent ${orderSide === OrderSide.BUY ? 'bg-accent-success text-white shadow-accent-success/20 scale-[1.02]' : 'bg-bg-deep border-accent-success/30 text-accent-success opacity-50 hover:opacity-100'}`}
              >
              {mode === TradingMode.FUTURES ? 'Open Long' : 'Buy'}
              </button>
              <button 
                  onClick={() => setOrderSide(OrderSide.SELL)} 
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all shadow-lg border border-transparent ${orderSide === OrderSide.SELL ? 'bg-accent-danger text-white shadow-accent-danger/20 scale-[1.02]' : 'bg-bg-deep border-accent-danger/30 text-accent-danger opacity-50 hover:opacity-100'}`}
              >
              {mode === TradingMode.FUTURES ? 'Open Short' : 'Sell'}
              </button>
          </div>
          
          <div className="space-y-2">
              <div className={`flex items-center justify-between bg-bg-deep px-3 py-2 rounded border ${orderType === OrderType.MARKET ? 'border-transparent opacity-50 cursor-not-allowed' : 'border-border-soft focus-within:border-white/30'} transition-colors`}>
                  <span className="text-[10px] text-slate-500">PRICE</span>
                  <input 
                      className="bg-transparent text-right text-sm w-20 outline-none text-white disabled:cursor-not-allowed" 
                      value={orderType === OrderType.MARKET ? 'Market' : price} 
                      onChange={e => setPrice(e.target.value)} 
                      placeholder="0.00" 
                      disabled={orderType === OrderType.MARKET}
                  />
              </div>
              <div className="flex items-center justify-between bg-bg-deep px-3 py-2 rounded border border-border-soft focus-within:border-white/30 transition-colors">
                  <span className="text-[10px] text-slate-500">AMOUNT</span>
                  <input className="bg-transparent text-right text-sm w-20 outline-none text-white" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              
              {mode === TradingMode.FUTURES && (
                  <div className="pt-2 border-t border-border-soft/20">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-slate-400">Leverage</span>
                          <span className={`text-xs font-mono font-bold ${leverage > 50 ? 'text-accent-danger' : leverage > 20 ? 'text-accent-warning' : 'text-accent-primary'}`}>{leverage}x</span>
                      </div>
                      <div className="px-1">
                          <input type="range" min="1" max="100" step="1" value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value))} className="w-full h-1.5 bg-bg-deep rounded-lg appearance-none cursor-pointer accent-accent-primary hover:accent-white transition-all"/>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>1x</span><span>100x</span></div>
                      {showLeverageWarn && (
                          <div className="mt-3 flex items-start gap-2 p-2 bg-accent-danger/10 border border-accent-danger/30 rounded text-accent-danger animate-pulse">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <p className="text-[10px] leading-tight font-bold">Risk Warning: High leverage increases liquidation risk.</p>
                          </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                          <input placeholder="SL" className="bg-bg-deep px-2 py-1.5 rounded border border-border-soft text-xs outline-none text-white focus:border-white/30" value={sl} onChange={e => setSl(e.target.value)} />
                          <input placeholder="TP" className="bg-bg-deep px-2 py-1.5 rounded border border-border-soft text-xs outline-none text-white focus:border-white/30" value={tp} onChange={e => setTp(e.target.value)} />
                      </div>
                  </div>
              )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-auto pt-2">
              <span>Avail: 1000 USDT</span>
          </div>

          <button onClick={handleOrder} className={`w-full py-3 rounded font-bold text-sm shadow-lg transition-all ${orderSide === OrderSide.BUY ? 'bg-accent-success hover:bg-emerald-500 shadow-accent-success/20' : 'bg-accent-danger hover:bg-red-500 shadow-accent-danger/20'} text-white`}>
              {orderSide === OrderSide.BUY ? (orderType === OrderType.MARKET ? 'Market Buy' : 'Limit Buy') : (orderType === OrderType.MARKET ? 'Market Sell' : 'Limit Sell')} {data.pair}
          </button>
      </div>
  );

  const OrderBookComponent = () => (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        <div className="px-3 py-2 border-b border-border-soft flex justify-between text-[10px] font-bold text-slate-500"><span>PRICE</span><span>AMOUNT</span></div>
        <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 overflow-hidden flex flex-col justify-end">
                    {data.orderBook.asks.slice(0, 15).reverse().map((a,i) => (
                        <div key={i} className="relative flex justify-between items-center px-3 py-0.5 hover:bg-white/5 cursor-pointer overflow-hidden group" onClick={() => setPrice(a.price.toString())}>
                            {/* ENHANCED DEPTH VISUALIZATION (Gradient Bars) */}
                            <div className="absolute top-0 right-0 h-full bg-gradient-to-l from-accent-danger/20 to-transparent transition-all duration-500 ease-out" style={{ width: `${Math.min((a.amount / maxAskVol) * 100, 100)}%` }}></div>
                            <span className="relative z-10 text-[10px] font-mono text-accent-danger group-hover:font-bold">{a.price.toFixed(2)}</span>
                            <span className="relative z-10 text-[10px] font-mono text-slate-400">{a.amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="py-2 text-center font-mono font-bold text-white bg-bg-deep border-y border-border-soft flex items-center justify-center gap-2 shadow-lg z-20">
                {data.ticker.lastPrice.toFixed(2)}
                <ArrowUp className={`w-3 h-3 ${data.ticker.priceChangePercent >= 0 ? 'text-accent-success' : 'text-accent-danger rotate-180'}`} />
                </div>
                <div className="flex-1 overflow-hidden">
                    {data.orderBook.bids.slice(0, 15).map((b,i) => (
                        <div key={i} className="relative flex justify-between items-center px-3 py-0.5 hover:bg-white/5 cursor-pointer overflow-hidden group" onClick={() => setPrice(b.price.toString())}>
                            {/* ENHANCED DEPTH VISUALIZATION (Gradient Bars) */}
                            <div className="absolute top-0 right-0 h-full bg-gradient-to-l from-accent-success/20 to-transparent transition-all duration-500 ease-out" style={{ width: `${Math.min((b.amount / maxBidVol) * 100, 100)}%` }}></div>
                            <span className="relative z-10 text-[10px] font-mono text-accent-success group-hover:font-bold">{b.price.toFixed(2)}</span>
                            <span className="relative z-10 text-[10px] font-mono text-slate-400">{b.amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );

  const OrdersListComponent = () => (
    <div className="flex-1 overflow-auto custom-scrollbar p-0 relative h-full">
        {activeTab === 'orders' && (
            <table className="w-full text-left border-collapse min-w-[400px]">
            <thead className="text-[10px] text-slate-500 bg-bg-deep sticky top-0 z-10">
                <tr><th className="px-4 py-2">Time</th><th className="px-4 py-2">Symbol</th><th className="px-4 py-2">Side</th><th className="px-4 py-2">Price</th><th className="px-4 py-2">Action</th></tr>
            </thead>
            <tbody className="text-xs font-mono text-slate-300">
                {data.orders.map(o => (
                <tr key={o.id} className="border-b border-border-soft/50 hover:bg-white/5">
                    <td className="px-4 py-2">{new Date(o.timestamp).toLocaleTimeString()}</td>
                    <td className="px-4 py-2 text-white">{o.symbol}</td>
                    <td className={`px-4 py-2 ${o.side === OrderSide.BUY ? 'text-accent-success' : 'text-accent-danger'}`}>{o.side}</td>
                    <td className="px-4 py-2">{o.price}</td>
                    <td className="px-4 py-2"><button onClick={() => marketService.cancelOrder(o.id)} className="text-accent-danger hover:text-white">Cancel</button></td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
        {activeTab === 'positions' && (
            <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="text-[10px] text-slate-500 bg-bg-deep sticky top-0 z-10">
                    <tr><th className="px-4 py-2">Symbol</th><th className="px-4 py-2">Size</th><th className="px-4 py-2">Entry</th><th className="px-4 py-2">SL/TP</th><th className="px-4 py-2">PNL</th><th className="px-4 py-2">Close</th></tr>
                </thead>
                <tbody className="text-xs font-mono text-slate-300">
                    {data.positions.map(p => (
                        <tr key={p.id} className="border-b border-border-soft/50 hover:bg-white/5">
                            <td className="px-4 py-2 text-white">{p.symbol} <span className={`text-[9px] px-1 rounded ${p.leverage > 20 ? 'bg-accent-warning text-bg-main' : 'bg-white/10 text-slate-400'}`}>{p.leverage}x</span></td>
                            <td className={`px-4 py-2 ${p.side === OrderSide.BUY ? 'text-accent-success' : 'text-accent-danger'}`}>{p.amount}</td>
                            <td className="px-4 py-2">{p.entryPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 text-[10px]">{p.sl || '-'}/{p.tp || '-'}</td>
                            <td className={`px-4 py-2 ${p.unrealizedPnl >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>{p.unrealizedPnl.toFixed(2)} ({p.pnlPercent.toFixed(2)}%)</td>
                            <td className="px-4 py-2">
                                <button onClick={() => setCloseModal({id: p.id, symbol: p.symbol, amount: p.amount, max: p.amount, position: p})} className="text-white bg-white/10 px-2 py-1 rounded text-[10px] hover:bg-white/20">Close</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
        {activeTab === 'history' && (
                <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="text-[10px] text-slate-500 bg-bg-deep sticky top-0 z-10">
                    <tr><th className="px-4 py-2">Time</th><th className="px-4 py-2">Symbol</th><th className="px-4 py-2">Side</th><th className="px-4 py-2">Price</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Realized PNL</th></tr>
                </thead>
                <tbody className="text-xs font-mono text-slate-300">
                    {data.tradeHistory.map(t => (
                    <tr key={t.id} className="border-b border-border-soft/50 hover:bg-white/5">
                        <td className="px-4 py-2">{new Date(t.timestamp).toLocaleTimeString()}</td>
                        <td className="px-4 py-2 text-white">{t.symbol}</td>
                        <td className={`px-4 py-2 ${t.side === OrderSide.BUY ? 'text-accent-success' : 'text-accent-danger'}`}>{t.side.toUpperCase()}</td>
                        <td className="px-4 py-2">{t.price.toFixed(2)}</td>
                        <td className="px-4 py-2">{t.amount}</td>
                        <td className={`px-4 py-2 font-bold ${t.pnl ? (t.pnl >= 0 ? 'text-accent-success' : 'text-accent-danger') : 'text-slate-500'}`}>
                            {t.pnl ? `${t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}` : '-'}
                        </td>
                    </tr>
                    ))}
                    {data.tradeHistory.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-600">No trade history available</td></tr>
                    )}
                </tbody>
                </table>
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-bg-main text-slate-300 font-sans overflow-hidden selection:bg-accent-primary/30 relative">
      
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {showAlertModal && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
              <div className="w-full max-w-sm bg-bg-panel border border-border-soft rounded-xl shadow-2xl p-6 relative">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">
                          <Bell className="w-5 h-5 text-accent-warning" />
                          Price Alerts
                      </h3>
                      <button onClick={() => setShowAlertModal(false)}><X className="w-4 h-4 hover:text-white"/></button>
                  </div>
                  <div className="space-y-4">
                      <div className="bg-bg-deep p-3 rounded-lg border border-border-soft">
                          <label className="text-[10px] text-slate-500 font-bold mb-2 block">SET ALERT ON {data.pair}</label>
                          <div className="flex gap-2">
                              <input 
                                  type="number" 
                                  value={newAlertPrice}
                                  onChange={(e) => setNewAlertPrice(e.target.value)}
                                  placeholder="Target Price..."
                                  className="flex-1 bg-bg-main border border-border-soft rounded px-3 text-sm text-white outline-none focus:border-accent-warning"
                              />
                              <button onClick={() => setNewAlertPrice(data.ticker.lastPrice.toString())} className="text-[10px] px-2 bg-white/5 hover:bg-white/10 rounded text-slate-400">Current</button>
                          </div>
                          <button 
                            onClick={handleAddAlert}
                            className="w-full mt-2 bg-accent-warning/20 hover:bg-accent-warning/30 text-accent-warning border border-accent-warning/50 py-2 rounded text-xs font-bold transition-colors"
                          >
                              Create Alert
                          </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                          {alerts.filter(a => a.symbol === data.pair).length === 0 && (
                              <div className="text-center text-xs text-slate-600 py-4">No active alerts for {data.pair}</div>
                          )}
                          {alerts.filter(a => a.symbol === data.pair).map(alert => (
                              <div key={alert.id} className={`flex justify-between items-center p-3 rounded border ${alert.active ? 'bg-bg-deep border-border-soft' : 'bg-white/5 border-transparent opacity-50'}`}>
                                  <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white">{alert.targetPrice}</span>
                                      <span className="text-[10px] text-slate-500">Trigger if {alert.condition}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${alert.active ? 'bg-accent-success' : 'bg-slate-600'}`}></span>
                                      <button onClick={() => handleDeleteAlert(alert.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showKycModal && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
              <div className="w-full max-w-lg bg-bg-panel border border-accent-primary/30 rounded-2xl shadow-[0_0_50px_rgba(123,91,255,0.15)] overflow-hidden relative flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-white/10 bg-gradient-to-r from-bg-deep to-bg-panel flex justify-between items-start shrink-0">
                      <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center border border-accent-primary/30 shadow-[0_0_15px_rgba(123,91,255,0.2)]">
                              <ShieldCheck className="w-6 h-6 text-accent-primary" />
                          </div>
                          <div>
                              <h3 className="text-white font-bold text-xl tracking-wide">ZK-ID Verification</h3>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Zero-Knowledge Proof Protocol
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setShowKycModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                      {kycStep === 'upload' && (
                          <div className="space-y-6 animate-slide-in">
                              <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-lg p-4 mb-6">
                                  <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> Required Documents</h4>
                                  <p className="text-xs text-slate-400 leading-relaxed">
                                      Please upload your Government-issued ID. The system will extract data locally to verify age (18+) and identity compliance. 
                                      No raw data leaves your device.
                                  </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <button 
                                    onClick={() => handleUploadId('front')}
                                    className={`h-32 sm:h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${kycFiles.front ? 'border-accent-success bg-accent-success/10' : 'border-border-soft hover:border-accent-primary hover:bg-white/5'}`}
                                  >
                                      {kycFiles.front ? (
                                          <>
                                            <CheckCircle2 className="w-8 h-8 text-accent-success" />
                                            <span className="text-xs font-bold text-accent-success">Front Uploaded</span>
                                          </>
                                      ) : (
                                          <>
                                            <UploadCloud className="w-8 h-8 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-400">Upload ID Front</span>
                                          </>
                                      )}
                                  </button>
                                  <button 
                                    onClick={() => handleUploadId('back')}
                                    className={`h-32 sm:h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${kycFiles.back ? 'border-accent-success bg-accent-success/10' : 'border-border-soft hover:border-accent-primary hover:bg-white/5'}`}
                                  >
                                      {kycFiles.back ? (
                                          <>
                                            <CheckCircle2 className="w-8 h-8 text-accent-success" />
                                            <span className="text-xs font-bold text-accent-success">Back Uploaded</span>
                                          </>
                                      ) : (
                                          <>
                                            <UploadCloud className="w-8 h-8 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-400">Upload ID Back</span>
                                          </>
                                      )}
                                  </button>
                              </div>
                              <button 
                                disabled={!kycFiles.front || !kycFiles.back}
                                onClick={() => setKycStep('face')} 
                                className="w-full mt-4 bg-accent-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                              >
                                  Next Step: Biometric Scan <MoveRight className="w-4 h-4" />
                              </button>
                          </div>
                      )}
                      {kycStep === 'face' && (
                          <div className="flex flex-col items-center space-y-6 animate-slide-in">
                               <div className="text-center space-y-2">
                                   <h3 className="text-white font-bold">Liveness Check</h3>
                                   <p className="text-xs text-slate-400">Center your face. Ensure good lighting.</p>
                               </div>
                               <div className="relative w-48 h-48 sm:w-64 sm:h-64 bg-black rounded-full border-4 border-white/10 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                   <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
                                       <UserCheck className="w-24 h-24 sm:w-32 sm:h-32 text-slate-700" />
                                   </div>
                                   <div className="absolute inset-0 z-10 grid grid-cols-4 grid-rows-4 opacity-30">
                                       {[...Array(16)].map((_,i) => <div key={i} className="border border-accent-primary/30"></div>)}
                                   </div>
                                   <div className="absolute inset-0 z-20 bg-gradient-to-b from-transparent via-accent-primary/30 to-transparent h-full w-full animate-[scan_2s_ease-in-out_infinite]"></div>
                                   <div className="absolute inset-4 border-2 border-dashed border-accent-primary/50 rounded-full z-30"></div>
                               </div>
                               <div className="w-full bg-bg-deep p-4 rounded-lg border border-border-soft">
                                   <div className="flex items-center gap-3 text-xs text-slate-400">
                                       <ScanLine className="w-4 h-4 text-accent-secondary" />
                                       <span>Analyzing facial geometry...</span>
                                   </div>
                               </div>
                               <button onClick={handleStartProcessing} className="w-full bg-accent-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg">
                                  <Camera className="w-4 h-4" /> Start Face Scan
                              </button>
                          </div>
                      )}
                      {kycStep === 'processing' && (
                          <div className="flex flex-col items-center justify-center py-4 space-y-8 animate-fade-in">
                              <div className="relative w-24 h-24">
                                  <div className="absolute inset-0 border-4 border-accent-primary/20 rounded-full"></div>
                                  <div className="absolute inset-0 border-4 border-t-accent-primary rounded-full animate-spin"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <Cpu className="w-8 h-8 text-white animate-pulse" />
                                  </div>
                              </div>
                              <div className="w-full space-y-2">
                                  {processingLogs.map((log, idx) => (
                                      <div key={idx} className="flex items-center gap-3 text-xs font-mono animate-fade-in">
                                          {idx < processingLogs.length - 1 ? (
                                              <CheckCircle2 className="w-4 h-4 text-accent-success shrink-0" />
                                          ) : (
                                              <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-accent-primary animate-spin shrink-0"></div>
                                          )}
                                          <span className={idx < processingLogs.length - 1 ? "text-slate-400" : "text-white font-bold"}>{log}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      {kycStep === 'verified' && (
                          <div className="animate-fade-in text-center space-y-6 py-4">
                              <div className="w-24 h-24 mx-auto bg-accent-success/10 rounded-full flex items-center justify-center border border-accent-success/30 shadow-[0_0_30px_rgba(76,175,80,0.3)]">
                                  <Check className="w-12 h-12 text-accent-success" />
                              </div>
                              <div>
                                  <h3 className="text-2xl font-bold text-white">Identity Verified</h3>
                                  <p className="text-sm text-slate-400 mt-2">Age (18+) Verified. Biometrics Matched.</p>
                              </div>
                              <div className="bg-bg-deep p-4 rounded-lg border border-border-soft text-left relative overflow-hidden group">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-accent-success"></div>
                                  <label className="text-[10px] text-slate-500 font-bold mb-1 block flex justify-between">
                                      <span>ZK-SNARK PROOF HASH</span>
                                      <span className="text-accent-success text-[10px]">VALID</span>
                                  </label>
                                  <div className="font-mono text-xs text-accent-primary break-all select-all cursor-pointer hover:text-white transition-colors">
                                      {zkProof}
                                  </div>
                              </div>
                              <button onClick={() => setShowKycModal(false)} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-lg transition-all">
                                  Return to Trading
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {closeModal && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm bg-bg-panel border border-border-soft rounded-lg shadow-2xl p-6">
                  <h3 className="text-white font-bold text-lg mb-4 flex justify-between items-center">
                      Close Position 
                      <button onClick={() => setCloseModal(null)}><X className="w-4 h-4 text-slate-500 hover:text-white"/></button>
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-slate-500">Amount to Close</label>
                          <div className="flex items-center gap-2 mt-1">
                              <input 
                                  type="number"
                                  className="w-full bg-bg-deep border border-border-soft rounded px-3 py-2 text-white focus:border-accent-primary outline-none"
                                  value={closeModal.amount}
                                  onChange={(e) => setCloseModal({...closeModal, amount: parseFloat(e.target.value)})}
                              />
                              <button onClick={() => setCloseModal({...closeModal, amount: closeModal.max})} className="text-xs text-accent-primary font-bold hover:text-white">MAX</button>
                          </div>
                      </div>
                      {exitDetails && (
                        <div className="bg-bg-deep p-3 rounded border border-border-soft/50 text-xs space-y-1">
                            <div className="flex justify-between text-slate-400"><span>Est. Value</span><span className="text-white">{exitDetails.exitValue.toFixed(2)}</span></div>
                            <div className="flex justify-between text-slate-400"><span>Est. Fee (0.06%)</span><span className="text-white">-{exitDetails.fee.toFixed(2)}</span></div>
                            <div className="h-px bg-border-soft/30 my-1"></div>
                            <div className="flex justify-between text-slate-400"><span>Gross PnL</span><span className={exitDetails.grossPnl >= 0 ? "text-accent-success" : "text-accent-danger"}>{exitDetails.grossPnl.toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold"><span>Net PnL</span><span className={exitDetails.netPnl >= 0 ? "text-accent-success" : "text-accent-danger"}>{exitDetails.netPnl.toFixed(2)}</span></div>
                        </div>
                      )}
                      <button 
                          onClick={handleClosePosition}
                          className="w-full bg-accent-primary hover:bg-blue-600 text-white py-2 rounded font-bold text-sm transition-colors"
                      >
                          Confirm Close
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showAnalysis && (
          <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
              <div className="w-full max-w-md bg-bg-panel border border-accent-secondary/30 rounded-xl shadow-[0_0_30px_rgba(55,197,255,0.15)] p-0 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-white/10 bg-bg-deep/80 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-accent-secondary animate-pulse" />
                          <span className="font-bold text-white tracking-wider">AYNU SMART SCAN</span>
                      </div>
                      <button onClick={() => setShowAnalysis(false)}><X className="w-5 h-5 hover:text-white"/></button>
                  </div>
                  <div className="p-6 min-h-[300px] flex flex-col relative">
                      {isAnalyzing ? (
                          <div className="flex-1 flex flex-col items-center justify-center gap-4">
                              <div className="relative w-16 h-16">
                                  <div className="absolute inset-0 border-4 border-accent-secondary/30 rounded-full"></div>
                                  <div className="absolute inset-0 border-4 border-t-accent-secondary rounded-full animate-spin"></div>
                              </div>
                              <p className="text-accent-secondary font-mono text-sm animate-pulse">ANALYZING MARKET DATA...</p>
                          </div>
                      ) : analysisResult ? (
                          <div className="space-y-6 animate-fade-in">
                              <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                      <span className="text-xs text-slate-500 uppercase tracking-widest">Recommendation</span>
                                      <span className={`text-4xl font-bold ${analysisResult.recommendation === 'BUY' ? 'text-accent-success' : analysisResult.recommendation === 'SELL' ? 'text-accent-danger' : 'text-accent-warning'}`}>
                                          {analysisResult.recommendation}
                                      </span>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-xs text-slate-500 uppercase tracking-widest">Confidence</div>
                                      <div className="text-2xl font-mono text-white">{analysisResult.confidence}%</div>
                                  </div>
                              </div>
                              <div className="bg-bg-deep p-4 rounded-lg border border-border-soft">
                                  <p className="text-sm text-slate-300 leading-relaxed">{analysisResult.reasoning}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-bg-deep p-3 rounded border border-border-soft">
                                      <div className="text-[10px] text-slate-500 uppercase">Support</div>
                                      <div className="text-lg font-mono text-accent-success">{analysisResult.keyLevels.support.toFixed(4)}</div>
                                  </div>
                                  <div className="bg-bg-deep p-3 rounded border border-border-soft">
                                      <div className="text-[10px] text-slate-500 uppercase">Resistance</div>
                                      <div className="text-lg font-mono text-accent-danger">{analysisResult.keyLevels.resistance.toFixed(4)}</div>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center text-red-400">Analysis Failed</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* NAVBAR */}
      <header className="h-14 border-b border-border-soft bg-bg-panel flex items-center px-4 justify-between shrink-0 z-40 transition-colors">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wider">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-accent-primary to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(123,91,255,0.3)]">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <span className="hidden sm:inline">AYNU.X</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-6 pl-6">
             <button onClick={() => setView('trade')} className={`text-sm font-bold transition-colors ${view === 'trade' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Trade</button>
             <button onClick={() => setView('p2p')} className={`text-sm font-bold transition-colors ${view === 'p2p' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>P2P</button>
             <button onClick={() => setView('metals')} className={`text-sm font-bold transition-colors ${view === 'metals' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Metals (RWA)</button>
          </nav>

          {view === 'trade' && (
             <div className="flex items-center gap-1 bg-bg-deep/50 p-1 rounded-lg border border-border-soft ml-0 md:ml-4 overflow-hidden">
                <button onClick={() => handleModeChange(TradingMode.SPOT)} className={`px-3 md:px-4 py-1.5 rounded text-[10px] md:text-xs font-bold ${mode === TradingMode.SPOT ? 'bg-accent-primary text-white' : ''}`}>Spot</button>
                <button onClick={() => handleModeChange(TradingMode.FUTURES)} className={`px-3 md:px-4 py-1.5 rounded text-[10px] md:text-xs font-bold ${mode === TradingMode.FUTURES ? 'bg-accent-warning text-bg-main' : ''}`}>Fut</button>
                <button onClick={() => handleModeChange(TradingMode.DEMO)} className={`px-3 md:px-4 py-1.5 rounded text-[10px] md:text-xs font-bold ${mode === TradingMode.DEMO ? 'bg-emerald-500 text-white' : ''}`}>Demo</button>
             </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
           
           {/* THEME SWITCHER */}
           <div className="relative">
              <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="p-2 hover:bg-white/10 rounded text-slate-400 hover:text-white" title="Change Theme">
                <Palette className="w-5 h-5" />
              </button>
              {showThemeMenu && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-bg-panel border border-border-soft rounded-lg shadow-xl overflow-hidden z-50">
                    <button onClick={() => { setTheme('official'); setShowThemeMenu(false); }} className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2 ${theme === 'official' ? 'text-accent-primary font-bold' : 'text-slate-300'}`}>
                        <div className="w-3 h-3 rounded-full bg-[#7b5bff]"></div> Official
                    </button>
                    <button onClick={() => { setTheme('male'); setShowThemeMenu(false); }} className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2 ${theme === 'male' ? 'text-accent-primary font-bold' : 'text-slate-300'}`}>
                         <div className="w-3 h-3 rounded-full bg-[#0A74DA]"></div> Male (Blue)
                    </button>
                    <button onClick={() => { setTheme('female'); setShowThemeMenu(false); }} className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2 ${theme === 'female' ? 'text-accent-primary font-bold' : 'text-slate-300'}`}>
                         <div className="w-3 h-3 rounded-full bg-[#F50057]"></div> Female (Pink)
                    </button>
                </div>
              )}
           </div>

           <button onClick={() => setShowAlertModal(true)} className="relative p-2 hover:bg-white/10 rounded text-slate-400 hover:text-white">
               <Bell className="w-5 h-5" />
               {activeAlertsCount > 0 && (
                   <span className="absolute top-1 right-1 w-2 h-2 bg-accent-warning rounded-full animate-pulse"></span>
               )}
           </button>
           <button onClick={performSmartScan} className="hidden sm:flex items-center gap-2 bg-accent-secondary/10 hover:bg-accent-secondary/20 text-accent-secondary px-3 py-1.5 rounded text-xs font-bold border border-accent-secondary/30 transition-colors">
               <Cpu className="w-4 h-4" /> Smart Scan
           </button>
           <button 
                onClick={() => { setShowKycModal(true); setKycStep('upload'); }} 
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-all ${kycStep === 'verified' ? 'bg-accent-success/20 border-accent-success/50 text-accent-success hover:bg-accent-success/30' : 'bg-bg-deep border-accent-primary/50 text-white hover:border-accent-primary hover:shadow-[0_0_10px_rgba(123,91,255,0.2)]'}`}
           >
               {kycStep === 'verified' ? (<><ShieldCheck className="w-4 h-4" /><span className="font-mono hidden lg:inline">{zkProof?.substring(0, 8)}...</span></>) : (<><Lock className="w-3 h-3" />ZK-KYC</>)}
           </button>
           <div className={`hidden lg:flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-border-soft/50 ${mode === TradingMode.DEMO ? 'bg-emerald-900/20 text-emerald-400' : 'bg-bg-deep'}`}>
              <span className={`w-2 h-2 rounded-full ${data.isLive ? 'bg-accent-success animate-pulse' : 'bg-red-500'}`}></span>
              <span className="font-mono">{data.isLive ? 'WS: LIVE' : 'POLLING'}</span>
           </div>
           <div className="flex bg-bg-deep rounded-full border border-border-soft/50 p-0.5">
                <button onClick={initChat} className="p-2 hover:bg-white/10 rounded-full text-accent-secondary relative" title="Text Chat">
                    <Bot className="w-5 h-5" />
                </button>
                <button onClick={toggleVoiceMode} className={`p-2 rounded-full transition-all ${isVoiceActive ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-slate-400'}`} title="Voice Mode">
                    {isVoiceActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
           </div>
        </div>
      </header>

      {isVoiceActive && (
          <div className="absolute top-20 right-6 z-50 bg-bg-panel/90 backdrop-blur border border-red-500/30 rounded-full px-6 py-3 flex items-center gap-4 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-fade-in">
              <div className="flex items-center gap-1 h-4">
                  {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 bg-red-500 rounded-full transition-all duration-75" style={{ height: `${4 + (voiceVolume * Math.random() * 20)}px` }}></div>
                  ))}
              </div>
              <div className="flex flex-col">
                  <span className="text-xs font-bold text-red-400">{isAiSpeaking ? 'AYNU SPEAKING...' : 'LISTENING...'}</span>
              </div>
              {isAiSpeaking && (
                  <Volume2 className="w-4 h-4 text-accent-secondary animate-pulse" />
              )}
          </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-16 lg:pb-0 transition-colors">
        
        {view === 'metals' && <MetalsView onClose={() => setView('trade')} />}
        
        {view === 'p2p' && <P2PView />}

        {view === 'trade' && (
            <>
                {/* LEFT SIDEBAR (Desktop Only) */}
                <aside className="w-64 bg-bg-panel border-r border-border-soft flex flex-col hidden lg:flex">
                <div className="flex border-b border-border-soft bg-bg-deep">
                    <button onClick={() => setLeftTab('markets')} className={`flex-1 py-2 text-[10px] font-bold ${leftTab === 'markets' ? 'text-white border-b-2 border-accent-primary' : 'text-slate-500'}`}>MARKETS</button>
                    <button onClick={() => setLeftTab('robots')} className={`flex-1 py-2 text-[10px] font-bold ${leftTab === 'robots' ? 'text-white border-b-2 border-accent-primary' : 'text-slate-500'}`}>ROBOTS</button>
                </div>
                {leftTab === 'markets' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {Object.values(PAIRS).map((p) => (
                        <button 
                        key={p.symbol}
                        onClick={() => handlePairChange(p.symbol)}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-border-soft/20 ${data.pair === p.symbol ? 'bg-accent-primary/10 border-l-2 border-l-accent-primary' : 'border-l-2 border-l-transparent'}`}
                        >
                        <span className="text-xs font-bold text-white">{p.symbol}</span>
                        <span className="text-xs font-mono text-white">{data.ticker.lastPrice.toFixed(2)}</span>
                        </button>
                    ))}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-deep/30">
                    {data.robots.map(r => (
                        <div key={r.id} className={`p-4 border-b border-border-soft/20 transition-colors ${r.active ? 'bg-accent-primary/5' : 'hover:bg-white/5'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <h4 className="text-xs font-bold text-white">{r.name}</h4>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 w-fit mt-1">{r.pair}</span>
                            </div>
                            <button onClick={() => marketService.toggleRobot(r.id)} className={`w-8 h-4 rounded-full relative transition-colors ${r.active ? 'bg-accent-success shadow-[0_0_10px_rgba(76,175,80,0.4)]' : 'bg-slate-600'}`}>
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${r.active ? 'left-4.5' : 'left-0.5'}`}></span>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-3 leading-tight min-h-[2.5em]">{r.description}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-bg-main p-2 rounded border border-border-soft/30">
                                <div className="text-[9px] text-slate-500">TOTAL PNL</div>
                                <div className={`text-xs font-mono font-bold ${r.pnl >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>{r.pnl > 0 ? '+' : ''}{r.pnl.toFixed(2)}</div>
                            </div>
                            <div className="bg-bg-main p-2 rounded border border-border-soft/30">
                                <div className="text-[9px] text-slate-500">ROI</div>
                                <div className={`text-xs font-mono font-bold ${r.pnlPercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>{r.pnlPercent.toFixed(1)}%</div>
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
                </aside>

                {/* CENTER - CHART & TRADING */}
                <section className="flex-1 flex flex-col min-w-0 bg-bg-main h-full relative">
                {/* Pair Info Header */}
                <div className="h-12 border-b border-border-soft flex items-center px-4 justify-between bg-bg-panel/50 backdrop-blur-sm z-10 shrink-0">
                    <div className="flex items-center gap-2 md:gap-4 overflow-x-auto">
                        <h2 className="text-sm md:text-lg font-bold text-white whitespace-nowrap">{data.pair}</h2>
                        <span className={`text-xs font-mono font-bold ${data.ticker.priceChangePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                             {data.ticker.lastPrice.toFixed(2)}
                        </span>
                        
                        <div className="hidden md:flex bg-bg-deep/50 rounded p-0.5 border border-border-soft overflow-x-auto max-w-[300px]">
                            {TIMEFRAMES.map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => handleTimeframeChange(t)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap ${data.timeframe === t ? 'bg-accent-primary text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                {t}
                                </button>
                            ))}
                        </div>

                        <div className="relative hidden md:block">
                            <button 
                                onClick={() => setShowIndMenu(!showIndMenu)}
                                className="flex items-center gap-1 text-xs text-white hover:text-accent-primary px-2 py-1 hover:bg-white/5 rounded"
                            >
                                <Layers className="w-4 h-4" /> <span className="hidden lg:inline">Indicators</span> <ChevronDown className="w-3 h-3"/>
                            </button>
                            {showIndMenu && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-bg-panel border border-border-soft rounded-lg shadow-2xl p-2 z-50">
                                    {availableIndicators.map(ind => (
                                        <div key={ind.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded cursor-pointer" onClick={() => toggleIndicator(ind.id)}>
                                            <span className="text-xs">{ind.label}</span>
                                            {activeIndicators.includes(ind.id) && <Eye className="w-3 h-3 text-accent-primary"/>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ADVANCED DRAWING TOOLBAR - Desktop */}
                    <div className="hidden md:flex items-center gap-1 bg-bg-deep/50 p-0.5 rounded border border-border-soft">
                        <button onClick={() => setDrawMode('none')} className={`p-1.5 rounded ${drawMode === 'none' ? 'bg-accent-primary text-white' : 'text-slate-400 hover:text-white'}`} title="Cursor"><Activity className="w-4 h-4" /></button>
                        <button onClick={() => setDrawMode('trendline')} className={`p-1.5 rounded ${drawMode === 'trendline' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`} title="Trendline"><Slash className="w-4 h-4" /></button>
                        <button onClick={() => setDrawMode('ray')} className={`p-1.5 rounded ${drawMode === 'ray' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`} title="Ray"><MoveRight className="w-4 h-4" /></button>
                        <button onClick={() => setDrawMode('horizontal')} className={`p-1.5 rounded ${drawMode === 'horizontal' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`} title="Horizontal"><Minus className="w-4 h-4" /></button>
                        <div className="w-px h-4 bg-slate-700 mx-1"></div>
                        <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="w-6 h-6 rounded bg-transparent cursor-pointer" />
                        <button onClick={handleClearDrawings} className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 ml-1" title="Clear All"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="relative border-b border-border-soft bg-bg-main shrink-0 h-[40vh] lg:h-auto lg:flex-1 transition-colors">
                    <ChartCanvas 
                        data={data.candles} 
                        indicators={data.indicators} 
                        activeIndicators={activeIndicators}
                        positions={data.positions}
                        orders={data.orders}
                        currentPair={data.pair}
                        drawMode={drawMode}
                        drawColor={drawColor}
                        onDrawingComplete={(d) => setDrawings([...drawings, d])}
                        onDeleteDrawing={handleDeleteDrawing}
                        drawings={drawings}
                        className="w-full h-full" 
                    />
                    
                    {/* ADVANCED CHAT WINDOW */}
                    {showAi && (
                    <div 
                        className={`fixed z-[100] flex flex-col bg-bg-panel/95 backdrop-blur-xl border border-accent-primary/30 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${isMobile ? 'inset-x-4 bottom-24 top-auto h-[450px] rounded-3xl' : ''}`}
                        style={!isMobile ? { left: chatBox.x, top: chatBox.y, width: chatBox.w, height: chatBox.minimized ? 'auto' : chatBox.h } : {}}
                    >
                        {/* Chat Header - Draggable */}
                        <div 
                            onMouseDown={startDrag}
                            className={`flex justify-between items-center p-4 bg-gradient-to-r from-bg-deep via-bg-deep to-bg-panel border-b border-white/10 ${!isMobile ? 'cursor-move select-none' : ''}`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <div className="w-2.5 h-2.5 bg-accent-success rounded-full animate-pulse"></div>
                                    <div className="absolute inset-0 bg-accent-success rounded-full animate-ping opacity-50"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
                                        AYNU BRAIN <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary font-mono border border-accent-primary/30">BETA</span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {!isMobile && (
                                    <>
                                        <button onClick={() => setChatBox(p => ({...p, minimized: !p.minimized}))} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
                                            {chatBox.minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setShowAi(false)} className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5"/></button>
                            </div>
                        </div>

                        {/* Chat Body */}
                        {!chatBox.minimized && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-bg-main/30 relative">
                                    {chatHistory.length === 0 && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center pointer-events-none opacity-50">
                                            <Bot className="w-12 h-12 mb-2" />
                                            <p className="text-xs">Ask me about market trends, price prediction, or sentiment analysis.</p>
                                        </div>
                                    )}
                                    {chatHistory.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-accent-primary text-white rounded-tr-sm' : 'bg-bg-deep border border-border-soft text-slate-200 rounded-tl-sm'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {liveTranscript.user && (
                                        <div className="flex justify-end opacity-70 animate-pulse">
                                            <div className="max-w-[85%] p-3 rounded-2xl text-xs bg-accent-primary/50 text-white rounded-tr-sm italic">{liveTranscript.user}...</div>
                                        </div>
                                    )}
                                    {liveTranscript.model && (
                                        <div className="flex justify-start opacity-70 animate-pulse">
                                            <div className="max-w-[85%] p-3 rounded-2xl text-xs bg-bg-deep border border-border-soft text-slate-200 rounded-tl-sm italic">{liveTranscript.model}...</div>
                                        </div>
                                    )}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-bg-deep border border-border-soft p-3 rounded-2xl rounded-tl-sm flex gap-1.5 shadow-sm">
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef}></div>
                                </div>
                                
                                <div className="p-3 bg-bg-deep border-t border-white/5">
                                    <div className="flex items-center gap-2 bg-bg-main border border-border-soft rounded-xl px-3 py-2 focus-within:border-accent-primary transition-all shadow-inner">
                                        <input 
                                            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-600" 
                                            placeholder={isVoiceActive ? "Listening..." : "Ask Aynu..."}
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            disabled={isVoiceActive}
                                        />
                                        <button onClick={handleSendMessage} disabled={chatLoading || isVoiceActive} className="text-accent-primary hover:text-white disabled:opacity-50 p-1 hover:bg-accent-primary/10 rounded-full transition-colors">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Resize Handle */}
                                {!isMobile && (
                                    <div 
                                        onMouseDown={startResize}
                                        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 opacity-50 hover:opacity-100"
                                    >
                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    )}
                </div>

                {/* MOBILE TRADING TABS & CONTENT */}
                <div className="flex-1 lg:hidden flex flex-col bg-bg-panel">
                    <div className="flex border-b border-border-soft bg-bg-deep">
                         <button onClick={() => setMobileTradeTab('form')} className={`flex-1 py-3 text-xs font-bold ${mobileTradeTab === 'form' ? 'text-white border-b-2 border-accent-primary' : 'text-slate-500'}`}>Trade</button>
                         <button onClick={() => setMobileTradeTab('book')} className={`flex-1 py-3 text-xs font-bold ${mobileTradeTab === 'book' ? 'text-white border-b-2 border-accent-primary' : 'text-slate-500'}`}>Book</button>
                         <button onClick={() => setMobileTradeTab('orders')} className={`flex-1 py-3 text-xs font-bold ${mobileTradeTab === 'orders' ? 'text-white border-b-2 border-accent-primary' : 'text-slate-500'}`}>Orders</button>
                    </div>
                    <div className="flex-1 overflow-y-auto relative">
                        {mobileTradeTab === 'form' && <OrderForm />}
                        {mobileTradeTab === 'book' && <OrderBookComponent />}
                        {mobileTradeTab === 'orders' && (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center border-b border-border-soft shrink-0">
                                    <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 text-xs font-bold border-b-2 ${activeTab === 'orders' ? 'border-accent-primary text-white' : 'border-transparent text-slate-500'}`}>Open</button>
                                    <button onClick={() => setActiveTab('positions')} className={`px-4 py-2 text-xs font-bold border-b-2 ${activeTab === 'positions' ? 'border-accent-primary text-white' : 'border-transparent text-slate-500'}`}>Pos</button>
                                    <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-xs font-bold border-b-2 ${activeTab === 'history' ? 'border-accent-primary text-white' : 'border-transparent text-slate-500'}`}>Hist</button>
                                </div>
                                <OrdersListComponent />
                            </div>
                        )}
                    </div>
                </div>

                {/* DESKTOP TRADING PANEL (Horizontal) */}
                <div className="hidden lg:flex h-72 bg-bg-panel border-t border-border-soft">
                    <div className="w-72 border-r border-border-soft">
                         <OrderForm />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center border-b border-border-soft shrink-0 bg-bg-deep/50">
                            <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 text-xs font-bold border-b-2 ${activeTab === 'orders' ? 'border-accent-primary text-white' : 'border-transparent text-slate-500'}`}>Open Orders ({data.orders.length})</button>
                            {mode === TradingMode.FUTURES && <button onClick={() => setActiveTab('positions')} className={`px-4 py-2 text-xs font-bold border-b-2 ${activeTab === 'positions' ? 'border-accent-primary text-white' : 'border-transparent text-slate-500'}`}>Positions ({data.positions.length})</button>}
                            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-xs font-bold border-b-2 ${activeTab === 'history' ? 'border-accent-primary text-white' : 'border-transparent text-slate-500'}`}>Trade History</button>
                        </div>
                        <OrdersListComponent />
                    </div>
                </div>
                </section>

                {/* RIGHT SIDEBAR - ORDERBOOK & TRADES (Desktop/Large Only) */}
                <aside className="w-64 bg-bg-panel border-l border-border-soft flex flex-col hidden xl:flex">
                <div className="flex border-b border-border-soft bg-bg-deep">
                    <button onClick={() => setRightTab('book')} className={`flex-1 py-2 text-[10px] font-bold ${rightTab === 'book' ? 'text-white border-b-2 border-accent-primary' : 'text-slate-500'}`}>ORDER BOOK</button>
                    <button onClick={() => setRightTab('trades')} className={`flex-1 py-2 text-[10px] font-bold ${rightTab === 'trades' ? 'text-white border-b-2 border-accent-primary' : 'text-slate-500'}`}>TRADES</button>
                </div>
                {rightTab === 'book' ? <OrderBookComponent /> : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="px-3 py-2 border-b border-border-soft flex justify-between text-[10px] font-bold text-slate-500">
                            <span className="flex-1">PRICE</span><span className="flex-1 text-right">AMT</span><span className="flex-1 text-right">TIME</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {data.trades.map((t) => (
                                <div key={t.id} className="flex justify-between items-center px-3 py-0.5 hover:bg-white/5">
                                    <span className={`flex-1 font-mono text-[10px] font-bold ${t.side === OrderSide.BUY ? 'text-accent-success' : 'text-accent-danger'}`}>{t.price.toFixed(2)}</span>
                                    <span className="flex-1 text-right font-mono text-[10px] text-slate-300">{t.amount.toFixed(3)}</span>
                                    <span className="flex-1 text-right font-mono text-[10px] text-slate-500">{new Date(t.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </aside>
            </>
        )}

      </main>
      <MobileBottomNav view={view} setView={setView} />
    </div>
  );
};

export default App;
