import { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { LiveTradingChart } from './LiveTradingChart';
import { CandlestickData, Time } from 'lightweight-charts';

export function MainDashboard() {
  const [data, setData] = useState<CandlestickData<Time>[]>([]);
  const [currentValue, setCurrentValue] = useState(1000);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [investedTime, setInvestedTime] = useState<number | null>(null);
  const [investedPrice, setInvestedPrice] = useState<number | null>(null);

  const isInvested = investedTime !== null;
  const investedAmount = isInvested ? 1000 : 0;
  
  // Calculate current balance based on shares held
  const sharesHeld = isInvested && investedPrice ? investedAmount / investedPrice : 0;
  const currentBalance = isInvested ? sharesHeld * currentValue : 0;
  const profit = currentBalance - investedAmount;

  // Use a ref for investedTime so the interval can access it without recreating
  const investedTimeRef = useRef(investedTime);
  investedTimeRef.current = investedTime;

  useEffect(() => {
    // 1. Generate historical OHLC data (120 bars of 1 minute)
    const currentRealMinute = Math.floor(Date.now() / 1000 / 60) * 60;
    
    // Start history such that it ends up exactly at 1000 right now
    const historyRev: CandlestickData<Time>[] = [];
    let nextClose = 1000;

    for (let i = 0; i <= 120; i++) {
        const time = (currentRealMinute - i * 60) as Time;
        const volatility = 5 + Math.random() * 20; 
        
        const open = nextClose - (Math.random() - 0.5) * volatility;
        const high = Math.max(open, nextClose) + Math.random() * 10;
        const low = Math.min(open, nextClose) - Math.random() * 10;

        historyRev.push({
            time,
            open,
            high,
            low,
            close: nextClose
        });
        
        nextClose = open;
    }
    
    const history = historyRev.reverse();
    setData(history);
    
    // 2. Start live simulation tick
    const interval = setInterval(() => {
      setData((prev) => {
        if (prev.length === 0) return prev;
        const lastCandle = prev[prev.length - 1];
        
        const nowMinute = Math.floor(Date.now() / 1000 / 60) * 60;
        
        let volatility = 10 + Math.random() * 40; 
        let change = (Math.random() - 0.5) * volatility;
        
        // Add random spikes to make it realistic up to 20000
        if (Math.random() > 0.95) {
          change += (Math.random() * 200 - 50); // Occasional pump
        }

        const iTime = investedTimeRef.current;
        if (iTime !== null) {
           const timeSinceInvested = Date.now() - iTime;
           if (timeSinceInvested > 60 * 60 * 1000) {
              // 1 hour has passed, make it a loss to 0
              change = -Math.abs(change) - 500; // Heavy crash
              if (lastCandle.close <= 0) change = 0;
           }
        }
        
        let newClose = lastCandle.close + change;
        
        // Keep within bounds 0 to 20000
        if (newClose > 20000) newClose = 20000 - Math.random() * 100;
        if (newClose <= 0) newClose = 0;
        
        const newCandles = [...prev];
        
        if (lastCandle.time === nowMinute) {
           // Update current minute candle
           newCandles[newCandles.length - 1] = {
             ...lastCandle,
             close: newClose,
             high: Math.max(lastCandle.high, newClose),
             low: Math.min(lastCandle.low, newClose)
           };
        } else if (nowMinute > lastCandle.time) {
           // New minute candle!
           newCandles.push({
             time: nowMinute as Time,
             open: lastCandle.close,
             high: Math.max(lastCandle.close, newClose),
             low: Math.min(lastCandle.close, newClose),
             close: newClose
           });
        }
        
        const latestClose = newCandles[newCandles.length - 1].close;
        setCurrentValue(latestClose);

        return newCandles;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleInvestConfirm = () => {
     setInvestedTime(Date.now());
     setInvestedPrice(currentValue);
     setIsModalOpen(false);
  };

  const isProfit = profit >= 0;
  const percentage = investedAmount > 0 ? (Math.abs(profit) / investedAmount) * 100 : 0;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden relative">
      
      {/* Top Header / Stats Bar */}
      <header className="flex-none p-6 md:p-8 border-b border-border bg-surface z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-2xl">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 rounded-2xl bg-surface-hover border border-border flex items-center justify-center shadow-inner">
              <Activity className="w-6 h-6 text-primary" />
           </div>
           <div>
              <h1 className="text-sm font-mono tracking-widest text-muted uppercase">LarkX Terminal</h1>
              <div className="flex items-center gap-2 mt-1.5">
                 <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-up opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-up"></span>
                 </span>
                 <p className="text-xs font-mono text-up tracking-widest uppercase">System Online</p>
              </div>
           </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-8 xl:gap-16">
           {!isInvested && (
             <button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-background font-mono px-6 py-2 rounded-lg font-bold hover:bg-white/90 transition-colors cursor-pointer"
             >
                Invest ₹1000
             </button>
           )}

           <div>
             <p className="text-[10px] sm:text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Invested amounts</p>
             <p className="text-xl xl:text-2xl font-mono text-primary">{formatCurrency(investedAmount)}</p>
           </div>
           
           <div>
             <p className="text-[10px] sm:text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Current Balance</p>
             <p className="text-2xl xl:text-4xl font-mono tracking-tighter transition-colors font-medium" style={{ color: isProfit ? 'var(--color-up)' : 'var(--color-down)' }}>
               {formatCurrency(currentBalance)}
             </p>
           </div>
           
           <div className="text-left md:text-right">
             <p className="text-[10px] sm:text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Session P/L</p>
             <div className="flex items-center md:justify-end gap-3">
                 <p className={`text-2xl xl:text-3xl font-mono tracking-tighter font-medium ${isProfit ? 'text-up' : 'text-down'}`}>
                   {isProfit ? '+' : '-'}{formatCurrency(Math.abs(profit))}
                 </p>
                 <span className={`text-xs md:text-sm font-mono flex items-center bg-surface-hover px-2 py-1.5 rounded-md border border-border ${isProfit ? 'text-up' : 'text-down'}`}>
                    {isProfit ? '+' : '-'}{percentage.toFixed(2)}%
                    {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 ml-1" /> : <ArrowDownRight className="w-3.5 h-3.5 ml-1" />}
                 </span>
             </div>
           </div>
        </div>
      </header>

      {/* Main Chart Area */}
      <main className="flex-1 w-full relative bg-background">
         {data.length > 0 && <LiveTradingChart data={data} />}
         
         <div className="absolute bottom-8 left-8 pointer-events-none z-0">
            <h2 className="text-6xl md:text-[120px] leading-none font-mono tracking-tighter opacity-5 uppercase font-bold select-none text-muted">
               LARK-X
            </h2>
            <p className="text-sm md:text-xl font-mono tracking-widest opacity-10 uppercase ml-2 mt-4 text-muted">
               Market Sync Protocol Active
            </p>
         </div>
         
         {/* Invest Modal */}
         {isModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-surface border border-border p-8 rounded-2xl shadow-2xl w-[90%] max-w-sm text-center">
                 <h3 className="text-xl font-mono font-bold text-primary mb-2">Invest your desired ₹1000</h3>
                 <p className="text-sm font-mono text-muted mb-6">This will allocate your capital to the live market sync protocol.</p>
                 <div className="flex gap-4">
                   <button 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-surface-hover text-primary font-mono py-2 rounded-lg border border-border hover:bg-surface transition-colors cursor-pointer"
                   >
                     Cancel
                   </button>
                   <button 
                      onClick={handleInvestConfirm}
                      className="flex-1 bg-primary text-background font-mono py-2 rounded-lg font-bold hover:bg-white/90 transition-colors cursor-pointer"
                   >
                     Confirm
                   </button>
                 </div>
              </div>
           </div>
         )}
      </main>
    </div>
  );
}
