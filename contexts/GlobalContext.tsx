import React, { createContext, useContext, useState, useEffect } from 'react';
import { GlobalContextType, HistoryItem, ToastMessage, Transaction, PaymentLinks } from '../types';
import { getHistory, saveHistoryItem } from '../services/historyService';
import { checkApiKey } from '../services/geminiService';

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobal must be used within a GlobalProvider');
  return context;
};

const DEFAULT_LINKS: PaymentLinks = {
  starter: '',
  pro: '',
  business: ''
};

const AuthErrorModal: React.FC = () => {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
    const handler = (e: any) => {
      setMessage(e.detail || 'Authentication required.');
      setShow(true);
    };
    window.addEventListener('auth-error', handler);
    return () => window.removeEventListener('auth-error', handler);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-purple-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 ring-1 ring-purple-500/20">
        <div className="w-16 h-16 bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 rounded-full flex items-center justify-center mb-6 border border-purple-500/30 shadow-inner animate-pulse">
          <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
          Authentication Settings Blocked
        </h2>
        
        <p className="text-neutral-400 mb-6 text-sm leading-relaxed max-w-sm">
          Your browser is blocking third-party cookies inside this iframe, which prevents server authentication. 
          To run the AI models and save your work, please open the application in a new tab.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full mb-6">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-purple-500/20"
          >
            <span>Open in New Tab</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          
          <button
            onClick={handleCopy}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {copied ? (
              <>
                <span className="text-green-400">Copied Link!</span>
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Copy App URL</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </>
            )}
          </button>
        </div>

        <div className="bg-purple-950/20 rounded-xl p-4 w-full border border-purple-500/20 text-left">
          <p className="text-purple-300 text-xs leading-relaxed">
            💡 <strong className="text-white">Alternative:</strong> You can also click the <strong className="text-white">↗</strong> icon at the very top right corner of the screen container to pop out this application.
          </p>
        </div>
      </div>
    </div>
  );
};

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize Credits from LocalStorage
  const [credits, setCredits] = useState(() => {
    try {
      const saved = localStorage.getItem('omnicreate_credits');
      return saved ? parseInt(saved, 10) : 50;
    } catch {
      return 50;
    }
  });

  // Initialize Transactions from LocalStorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('omnicreate_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // UI State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  // Load payment links
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinks>(() => {
    try {
      const saved = localStorage.getItem('omnicreate_payment_links');
      return saved ? JSON.parse(saved) : DEFAULT_LINKS;
    } catch (e) {
      return DEFAULT_LINKS;
    }
  });

  useEffect(() => {
    setHistory(getHistory());
    checkApiKey().then(setHasApiKey);
  }, []);

  // Persist Credits whenever they change
  useEffect(() => {
    localStorage.setItem('omnicreate_credits', credits.toString());
  }, [credits]);

  // Persist Transactions whenever they change
  useEffect(() => {
    localStorage.setItem('omnicreate_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const deductCredits = (amount: number) => {
    if (credits >= amount) {
      setCredits(prev => prev - amount);
      return true;
    }
    setIsCreditsModalOpen(true); // Auto-open modal if low credits
    addToast('error', 'Insufficient credits! Please top up.');
    return false;
  };

  const addCredits = (amount: number, price: number = 0, planName: string = 'Bonus') => {
    setCredits(prev => prev + amount);
    
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      planName,
      amount,
      price,
      date: Date.now(),
      status: 'completed'
    };
    
    setTransactions(prev => [newTransaction, ...prev]);
    
    if (price > 0) {
      addToast('success', `Purchase successful! Added ${amount} credits.`);
    } else {
      addToast('success', `Received ${amount} credits!`);
    }
  };

  const addToast = (type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const updated = saveHistoryItem(item);
    setHistory(updated);
  };

  const updatePaymentLinks = (links: PaymentLinks) => {
    setPaymentLinks(links);
    localStorage.setItem('omnicreate_payment_links', JSON.stringify(links));
    addToast('success', 'Payment links saved!');
  };

  return (
    <GlobalContext.Provider value={{
      credits,
      deductCredits,
      addCredits,
      addToast,
      history,
      addToHistory,
      transactions,
      isHistoryOpen,
      setIsHistoryOpen,
      isCreditsModalOpen,
      setIsCreditsModalOpen,
      isApiKeyModalOpen,
      setIsApiKeyModalOpen,
      hasApiKey,
      setHasApiKey,
      paymentLinks,
      updatePaymentLinks
    }}>
      {children}

      <AuthErrorModal />
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`
            pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md animate-fade-in flex items-center gap-2 max-w-sm
            ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200' : 
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 
              'bg-blue-500/10 border-blue-500/50 text-blue-200'}
          `}>
            <div className={`w-2 h-2 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-400' : 
              toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
            }`} />
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </GlobalContext.Provider>
  );
};