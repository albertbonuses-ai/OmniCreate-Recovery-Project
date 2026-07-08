import React, { useMemo, useState } from 'react';
import { useGlobal } from '../contexts/GlobalContext';
import { ToolType } from '../types';
import { TrendingUp, DollarSign, Activity, Users, Video, Image as ImageIcon, PenTool, Database, ShoppingCart, CheckCircle, PlusCircle, Trash2, ShieldAlert, Link, Save, Speaker, Mic, Zap, Clock } from 'lucide-react';
import { clearHistory } from '../services/historyService';

export const AdminDashboard: React.FC = () => {
  const { history, transactions, addCredits, addToast, paymentLinks, updatePaymentLinks } = useGlobal();
  const [manualAmount, setManualAmount] = useState(500);
  
  // Local state for editing links
  const [links, setLinks] = useState(paymentLinks);

  const TOOLS_DISPLAY = useMemo(() => [
    { id: ToolType.VIDEO, label: 'AI Video', icon: <Video size={14} />, color: 'bg-indigo-500' },
    { id: ToolType.IMAGE, label: 'AI Images', icon: <ImageIcon size={14} />, color: 'bg-purple-500' },
    { id: ToolType.WRITER, label: 'AI Writer', icon: <PenTool size={14} />, color: 'bg-sky-500' },
    { id: ToolType.TTS, label: 'Voice AI', icon: <Speaker size={14} />, color: 'bg-blue-500' },
    { id: ToolType.TRANSCRIPTION, label: 'Transcription', icon: <Mic size={14} />, color: 'bg-amber-500' },
  ], []);

  // --- BUSINESS LOGIC ---
  const METRICS = useMemo(() => {
    // 1. Calculate Gross Revenue (Actual Sales)
    const grossRevenue = transactions.reduce((sum, t) => sum + t.price, 0);

    // 2. Calculate API Cost & Credit Usage
    let totalApiCost = 0;
    let totalTokens = 0;
    let totalCreditsConsumed = 0;

    // Initialize counters
    let usageByTool: Record<string, number> = {
      [ToolType.VIDEO]: 0,
      [ToolType.IMAGE]: 0,
      [ToolType.WRITER]: 0,
      [ToolType.TTS]: 0,
      [ToolType.TRANSCRIPTION]: 0,
    };

    let creditsByTool: Record<string, number> = {
      [ToolType.VIDEO]: 0,
      [ToolType.IMAGE]: 0,
      [ToolType.WRITER]: 0,
      [ToolType.TTS]: 0,
      [ToolType.TRANSCRIPTION]: 0,
    };

    history.forEach(item => {
      let itemApiCost = 0;
      let itemCredits = 0;

      // Determine Credits and API Cost based on tool and metadata
      if (item.tool === ToolType.VIDEO) {
         // Credits: 4K = 20, 1080p = 15, 720p = 10
         if (item.metadata?.resolution === '4K') itemCredits = 20;
         else if (item.metadata?.resolution === '1080p') itemCredits = 15;
         else itemCredits = 10;
         
         // API Cost: Est $0.20 per video
         itemApiCost = 0.20;
      } 
      else if (item.tool === ToolType.IMAGE) {
         // Check if edit mode via metadata
         if (item.metadata?.mode === 'edit') {
            itemCredits = 3;
         } else {
            // Credits: 1:1 = 2, Others = 3
            itemCredits = item.metadata?.aspectRatio === '1:1' ? 2 : 3;
         }
         // API Cost: ~$0.04
         itemApiCost = 0.04;
      }
      else if (item.tool === ToolType.WRITER) {
         itemCredits = 1;
         if (item.usage) {
            // ~$0.10 per 1M tokens
            itemApiCost = (item.usage.totalTokens / 1_000_000) * 0.10; 
            totalTokens += item.usage.totalTokens;
         } else {
            itemApiCost = 0.0001;
         }
      }
      else if (item.tool === ToolType.TTS) {
         itemCredits = 3;
         itemApiCost = 0.005;
      }
      else if (item.tool === ToolType.TRANSCRIPTION) {
         itemCredits = 5;
         itemApiCost = 0.005;
      }

      // Update aggregates
      if (usageByTool[item.tool] !== undefined) {
          usageByTool[item.tool]++;
          creditsByTool[item.tool] += itemCredits;
      }
      
      totalApiCost += itemApiCost;
      totalCreditsConsumed += itemCredits;
    });

    const netProfit = grossRevenue - totalApiCost;
    // Prevent division by zero for margin
    const margin = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100) : 0;

    return {
      grossRevenue,
      cost: totalApiCost,
      profit: netProfit,
      margin,
      totalTokens,
      usageByTool,
      creditsByTool,
      totalCreditsConsumed
    };
  }, [history, transactions]);

  const handleManualInject = () => {
    addCredits(manualAmount, 0, 'Admin Gift');
    addToast('success', `Manually added ${manualAmount} credits.`);
  };

  const handleResetData = () => {
    if (confirm("Are you sure? This will clear all history and usage data. (Credits will remain)")) {
      clearHistory();
      window.location.reload();
    }
  };

  const handleSaveLinks = () => {
    updatePaymentLinks(links);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            Owner View
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Business Analytics</h2>
          <p className="text-slate-400">Real-time profitability tracking of your AI SaaS.</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={48} className="text-sky-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Gross Revenue</p>
          <h3 className="text-3xl font-bold text-white">${METRICS.grossRevenue.toFixed(2)}</h3>
          <p className="text-xs text-sky-400 mt-2 flex items-center gap-1">
             <ShoppingCart size={12} /> Total Sales
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={48} className="text-purple-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">API Costs (Est)</p>
          <h3 className="text-3xl font-bold text-white">${METRICS.cost.toFixed(4)}</h3>
          <p className="text-xs text-purple-400 mt-2">
             Google Gemini Usage
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={48} className="text-emerald-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Net Profit</p>
          <h3 className={`text-3xl font-bold ${METRICS.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${METRICS.profit.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">
             Margin: <span className="text-white font-bold">{METRICS.margin.toFixed(1)}%</span>
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={48} className="text-amber-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Credits Consumed</p>
          <h3 className="text-3xl font-bold text-white">{METRICS.totalCreditsConsumed}</h3>
          <p className="text-xs text-amber-400 mt-2">
             Total Platform Usage
          </p>
        </div>
      </div>

      {/* Admin Actions Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={20} />
            Admin Actions
          </h3>
          <div className="grid grid-cols-1 gap-8">
            
            {/* Manual Credit Injection */}
            <div className="space-y-4">
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Manual Credit Injection</h4>
                  <p className="text-xs text-slate-500 mb-4">Use this after receiving manual payment (Wire/PayPal) to top up a user account.</p>
                  <div className="flex gap-2">
                    <select 
                      value={manualAmount}
                      onChange={(e) => setManualAmount(Number(e.target.value))}
                      className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="100">100 Credits</option>
                      <option value="500">500 Credits</option>
                      <option value="1000">1,000 Credits</option>
                      <option value="5000">5,000 Credits</option>
                    </select>
                    <button 
                      onClick={handleManualInject}
                      className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <PlusCircle size={16} />
                      Add Credits
                    </button>
                  </div>
               </div>
            </div>

            {/* Data Management */}
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                 <h4 className="text-sm font-medium text-slate-300 mb-2">System Maintenance</h4>
                 <p className="text-xs text-slate-500 mb-4">Clear local history and cache. Does not affect credit balance.</p>
                 <button 
                   onClick={handleResetData}
                   className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                 >
                   <Trash2 size={16} />
                   Clear All History
                 </button>
              </div>
            </div>

          </div>
        </div>

        {/* Recent Activity Panel */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="text-sky-400" size={20} />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {history.slice(0, 5).map((item) => {
              const toolInfo = TOOLS_DISPLAY.find(t => t.id === item.tool);
              return (
                <div key={item.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${toolInfo?.color || 'bg-slate-700'}`}>
                      {toolInfo?.icon || <Activity size={14} />}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{toolInfo?.label || item.tool}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{item.summary}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
            {history.length === 0 && (
              <p className="text-center text-slate-500 py-4 text-sm">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

       {/* Payment Configuration */}
       <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
           <div>
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <Link className="text-sky-400" size={20} />
               Payment Links
             </h3>
             <p className="text-sm text-slate-400 mt-1">Paste your Stripe/Gumroad payment links here. Users will be redirected here when they click "Buy".</p>
           </div>
           <button 
              onClick={handleSaveLinks}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
            >
              <Save size={16} />
              Save Links
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Starter Plan Link</label>
            <input 
              type="text" 
              value={links.starter}
              onChange={(e) => setLinks({...links, starter: e.target.value})}
              placeholder="https://buy.stripe.com/..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Pro Plan Link</label>
            <input 
              type="text" 
              value={links.pro}
              onChange={(e) => setLinks({...links, pro: e.target.value})}
              placeholder="https://buy.stripe.com/..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Business Plan Link</label>
            <input 
              type="text" 
              value={links.business}
              onChange={(e) => setLinks({...links, business: e.target.value})}
              placeholder="https://buy.stripe.com/..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Transactions & Usage Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Transactions Table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6 h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Live Stream</span>
          </div>
          
          <div className="overflow-hidden">
             {transactions.length === 0 ? (
               <div className="text-center py-10 text-slate-500">
                 <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                 <p>No sales yet.</p>
               </div>
             ) : (
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                   <tr>
                     <th className="px-4 py-3 rounded-l-lg">Plan</th>
                     <th className="px-4 py-3">Date</th>
                     <th className="px-4 py-3">Amount</th>
                     <th className="px-4 py-3 rounded-r-lg text-right">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700">
                   {transactions.map((t) => (
                     <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                       <td className="px-4 py-3 font-medium text-white">
                         {t.planName}
                         <span className="block text-xs text-slate-500">{t.amount} Credits</span>
                       </td>
                       <td className="px-4 py-3 text-slate-400">
                         {new Date(t.date).toLocaleDateString()}
                       </td>
                       <td className="px-4 py-3 font-bold text-emerald-400">
                         {t.price > 0 ? `+$${t.price.toFixed(2)}` : 'Manual'}
                       </td>
                       <td className="px-4 py-3 text-right">
                         <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                           <CheckCircle size={10} /> {t.price > 0 ? 'PAID' : 'GIFT'}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </div>
        </div>

        {/* Usage Stats with Credits */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6 h-full">
          <h3 className="text-lg font-bold text-white mb-6">Credit Consumption by Tool</h3>
          <div className="space-y-6">
            
            {TOOLS_DISPLAY.map((tool) => {
               const usageCount = METRICS.usageByTool[tool.id] || 0;
               const creditsUsed = METRICS.creditsByTool[tool.id] || 0;
               // Calculate percentage against total credits consumed (avoid division by zero)
               const percent = METRICS.totalCreditsConsumed > 0 
                  ? (creditsUsed / METRICS.totalCreditsConsumed) * 100 
                  : 0;
               
               return (
                <div key={tool.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      {tool.icon} {tool.label}
                    </span>
                    <div className="text-right">
                       <span className="text-white font-medium block">{creditsUsed} Credits</span>
                       <span className="text-xs text-slate-500">{usageCount} generations</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden flex">
                    <div className={`${tool.color} h-full transition-all duration-500`} style={{ width: `${Math.max(percent, 0)}%` }}></div>
                  </div>
                </div>
               );
            })}

          </div>
        </div>

      </div>
    </div>
  );
};