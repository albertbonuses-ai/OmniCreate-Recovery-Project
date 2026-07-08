import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Image as ImageIcon, 
  PenTool, 
  Mic, 
  Speaker, 
  Menu,
  X,
  LayoutDashboard,
  History,
  Zap,
  ImagePlus,
  Key,
  ShieldCheck
} from 'lucide-react';
import { NavItem, ToolType } from '../types';
import { useGlobal } from '../contexts/GlobalContext';
import { HistorySidebar } from './HistorySidebar';
import { CreditsModal } from './CreditsModal';

const NAV_ITEMS: NavItem[] = [
  { id: ToolType.HOME, label: 'Dashboard', icon: <LayoutDashboard size={20} />, description: 'Overview' },
  { id: ToolType.VIDEO, label: 'AI Video', icon: <Video size={20} />, description: 'Create scroll-stopping videos' },
  { id: ToolType.IMAGE, label: 'AI Images', icon: <ImageIcon size={20} />, description: 'Generate stunning visuals' },
  { id: ToolType.WRITER, label: 'AI Writer', icon: <PenTool size={20} />, description: 'Emails, blogs & captions' },
  { id: ToolType.TRANSCRIPTION, label: 'Transcription', icon: <Mic size={20} />, description: 'Audio/Video to Text' },
  { id: ToolType.TTS, label: 'Text to Speech', icon: <Speaker size={20} />, description: 'Natural voiceovers' },
];

interface LayoutProps {
  currentTool: ToolType;
  onNavigate: (tool: ToolType) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentTool, onNavigate, children }) => {
  const { credits, setIsHistoryOpen, setIsCreditsModalOpen } = useGlobal();

  return (
    <div className="min-h-screen flex bg-[#0b0f19] text-slate-100 font-sans">
      <HistorySidebar />
      <CreditsModal />

      {/* Top Mobile Bar */}
      <div className="lg:hidden fixed top-0 w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 z-40 px-4 py-3 flex items-center justify-between">
        <div className="font-bold text-lg bg-gradient-to-r from-sky-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
          OmniCreate
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsHistoryOpen(true)}
             className="p-2 text-slate-300 hover:text-white"
          >
            <History size={20} />
          </button>
           <button 
             onClick={() => setIsCreditsModalOpen(true)}
             className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700"
           >
              <Zap size={14} className="text-amber-400" fill="currentColor" />
              <span className="text-xs font-bold text-amber-100">{credits}</span>
            </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
        <div className="p-6">
          <h1 className="text-2xl font-black italic tracking-tight bg-gradient-to-r from-sky-400 via-purple-400 to-amber-400 bg-clip-text text-transparent mb-1">
            OmniCreate
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold ml-1">AI Creative Suite</p>
        </div>

        <nav className="flex-1 px-3 space-y-2 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold group relative overflow-hidden
                ${currentTool === item.id 
                  ? 'bg-gradient-to-r from-sky-600/20 to-purple-600/20 text-white border-l-2 border-amber-400' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <span className={`relative z-10 ${currentTool === item.id ? 'text-amber-400' : 'group-hover:text-sky-400 transition-colors'}`}>
                {item.icon}
              </span>
              <span className="relative z-10">{item.label}</span>
              
              {currentTool === item.id && (
                 <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-purple-600 opacity-10 blur-sm"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 mb-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Balance</span>
              <Zap size={14} className="text-amber-400" fill="currentColor" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">{credits} <span className="text-xs font-normal text-slate-500">cr</span></div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-700/30">
               <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" style={{ width: `${Math.min((credits / 100) * 100, 100)}%` }}></div>
            </div>
            <button 
              onClick={() => setIsCreditsModalOpen(true)}
              className="w-full mt-3 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-lg transition-colors"
            >
              Top Up
            </button>
          </div>
          
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
               AI
            </div>
            <div className="flex-1">
               <div className="text-xs font-bold text-white">Creator</div>
               <div className="text-[10px] text-slate-500">Pro Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-24">
           {children}
        </div>
      </main>
    </div>
  );
};