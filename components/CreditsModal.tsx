import React, { useState } from 'react';
import { X, Zap, Check, Video, Image as ImageIcon, PenTool, Mic, Speaker, ImagePlus, Loader2, CreditCard, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';

const COSTS = [
  { tool: 'AI Video', cost: 10, icon: <Video size={16} /> },
  { tool: 'Transcription', cost: 5, icon: <Mic size={16} /> },
  { tool: 'Image Gen/Edit', cost: '2-3', icon: <ImageIcon size={16} /> },
  { tool: 'Text to Speech', cost: 3, icon: <Speaker size={16} /> },
  { tool: 'AI Writer', cost: 1, icon: <PenTool size={16} /> },
];

const PLANS = [
  { id: 'starter', amount: 100, price: 5, label: 'Starter', popular: false },
  { id: 'pro', amount: 500, price: 20, label: 'Pro', popular: true },
  { id: 'business', amount: 1500, price: 50, label: 'Business', popular: false },
];

export const CreditsModal: React.FC = () => {
  const { isCreditsModalOpen, setIsCreditsModalOpen, addCredits, credits, paymentLinks, addToast } = useGlobal();
  const [processingPlan, setProcessingPlan] = useState<number | null>(null);

  if (!isCreditsModalOpen) return null;

  const handlePurchase = async (plan: typeof PLANS[0]) => {
    // 1. If Payment Link exists, open it in new tab
    const link = paymentLinks[plan.id as keyof typeof paymentLinks];
    if (typeof link === 'string' && link.startsWith('http')) {
      window.open(link, '_blank');
      addToast('info', 'Redirecting to secure checkout...');
      setIsCreditsModalOpen(false);
      return;
    }

    // 2. If NO Payment Link, fallback to DEMO SIMULATION
    setProcessingPlan(plan.amount);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Add credits AND record the transaction (Price, Plan Name)
    addCredits(plan.amount, plan.price, plan.label);
    
    setProcessingPlan(null);
    setIsCreditsModalOpen(false);
  };

  const hasLiveLinks = Object.values(paymentLinks).some(link => typeof link === 'string' && link.startsWith('http'));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !processingPlan && setIsCreditsModalOpen(false)}
      />

      {/* Modal Content */}
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Side: Status & Costs */}
        <div className="md:w-1/3 bg-slate-800/50 p-8 border-r border-slate-700/50 flex flex-col">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Balance</h3>
            <div className="flex items-center gap-2 text-4xl font-bold text-white">
              <Zap className="text-amber-400 fill-current" size={32} />
              {credits}
            </div>
            <p className="text-slate-500 text-sm mt-2">Credits never expire.</p>
          </div>

          <div className="flex-1">
             <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Service Costs</h3>
             <div className="space-y-3">
               {COSTS.map((item) => (
                 <div key={item.tool} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-3 text-slate-300">
                     <div className="p-1.5 bg-slate-800 rounded-lg text-purple-400">
                       {item.icon}
                     </div>
                     {item.tool}
                   </div>
                   <div className="font-semibold text-slate-200">{item.cost} <span className="text-slate-500 font-normal text-xs">credits</span></div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Right Side: Top Up */}
        <div className="md:w-2/3 p-8 bg-gradient-to-br from-slate-900 to-purple-900/20 overflow-y-auto relative">
          
          {/* Mode Banner */}
          {!hasLiveLinks ? (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-amber-200">
                <p className="font-bold mb-0.5">Test Mode Active</p>
                <p className="opacity-80">Payments are simulated. Click "Purchase" to add credits instantly.</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-start gap-3">
              <ShieldCheck className="text-purple-400 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-purple-200">
                <p className="font-bold mb-0.5">Secure Checkout</p>
                <p className="opacity-80">You will be redirected to our secure payment partner.</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Top Up Credits</h2>
              <p className="text-slate-400">Choose a package that suits your creative needs.</p>
            </div>
            <button 
              onClick={() => setIsCreditsModalOpen(false)}
              disabled={!!processingPlan}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div 
                key={plan.amount} 
                className={`relative rounded-2xl p-6 border transition-all 
                  ${processingPlan && processingPlan !== plan.amount ? 'opacity-50 grayscale' : ''}
                  ${plan.popular 
                    ? 'bg-purple-600/10 border-purple-500/50 hover:border-purple-400' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">
                    Most Popular
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-200 mb-1">{plan.label}</h3>
                  <div className="text-3xl font-bold text-white mb-2">{plan.amount} <span className="text-sm font-normal text-slate-400">credits</span></div>
                  <div className="text-xl text-slate-300 mb-6">${plan.price}</div>
                  
                  <button 
                    onClick={() => handlePurchase(plan)}
                    disabled={!!processingPlan}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
                      ${plan.popular 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg' 
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}
                      disabled:opacity-80 disabled:cursor-not-allowed
                    `}
                  >
                    {processingPlan === plan.amount ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        {hasLiveLinks ? <ExternalLink size={16} /> : <CreditCard size={16} />}
                        <span>{hasLiveLinks ? 'Buy Now' : 'Purchase'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
             <div className="flex items-start gap-3">
               <div className="p-2 bg-sky-500/10 rounded-full text-sky-400 mt-0.5">
                 <Check size={16} />
               </div>
               <div>
                 <h4 className="text-sm font-semibold text-white">Enterprise & API Access</h4>
                 <p className="text-xs text-slate-400 mt-1">Need high volume or API access? Contact our sales team for custom enterprise packages.</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};