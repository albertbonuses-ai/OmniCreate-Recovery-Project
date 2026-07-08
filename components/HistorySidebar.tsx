import React from 'react';
import { X, Video, Image as ImageIcon, PenTool, Mic, Speaker, Calendar, Copy, ExternalLink, ImagePlus, Cpu } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';
import { ToolType } from '../types';

export const HistorySidebar: React.FC = () => {
  const { history, isHistoryOpen, setIsHistoryOpen, addToast } = useGlobal();

  const getIcon = (tool: ToolType) => {
    switch (tool) {
      case ToolType.VIDEO: return <Video size={16} />;
      case ToolType.IMAGE: return <ImageIcon size={16} />;
      case ToolType.WRITER: return <PenTool size={16} />;
      case ToolType.TRANSCRIPTION: return <Mic size={16} />;
      case ToolType.TTS: return <Speaker size={16} />;
      default: return <PenTool size={16} />;
    }
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    addToast('success', 'Copied to clipboard!');
  };

  return (
    <div className={`
      fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col
      ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-r from-sky-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">Activity History</h2>
        <button 
          onClick={() => setIsHistoryOpen(false)}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>No history yet.</p>
            <p className="text-sm">Start generating content to see it here.</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-700 text-purple-300">
                      {getIcon(item.tool)}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                 </div>
                 {item.usage && item.usage.totalTokens > 0 && (
                   <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20" title="Token Usage">
                     <Cpu size={10} />
                     <span>{item.usage.totalTokens} Tok</span>
                   </div>
                 )}
              </div>
              
              <div className="mb-3">
                 {/* Preview logic */}
                 {(item.tool === ToolType.IMAGE) ? (
                    <img src={item.content} alt="history" className="w-full h-32 object-cover rounded-lg mb-2 bg-slate-950 border border-slate-700/50" />
                 ) : null}
                 
                 <p className="text-sm text-slate-200 line-clamp-2 mb-1 font-medium">{item.summary}</p>
                 <p className="text-xs text-slate-500 truncate font-mono bg-slate-900/50 p-1 rounded">{item.content.substring(0, 50)}...</p>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                <button 
                  onClick={() => copyContent(item.content)}
                  className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  <Copy size={12} /> Copy
                </button>
                {(item.tool === ToolType.IMAGE || item.tool === ToolType.VIDEO) && (
                   <a 
                   href={item.content}
                   download
                   className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                 >
                   <ExternalLink size={12} /> Download
                 </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};