import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, FileAudio, Loader2, FileText, Download, Copy, Check } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';
import { useGlobal } from '../contexts/GlobalContext';
import { ToolType } from '../types';

export const Transcriber: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { deductCredits, addToast, addToHistory, hasApiKey, setIsApiKeyModalOpen, history } = useGlobal();
  const COST = 5;

  // Restore Last Creation
  useEffect(() => {
    if (!transcription) {
      const lastItem = history.find(h => h.tool === ToolType.TRANSCRIPTION);
      if (lastItem) {
        setTranscription(lastItem.content);
      }
    }
  }, [history]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setTranscription('');
    }
  };

  const handleTranscribe = async () => {
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      addToast('error', "Please connect your API Key first.");
      return;
    }

    if (!file) return;
    if (!deductCredits(COST)) return;

    setIsLoading(true);
    
    try {
      const text = await transcribeAudio(file);
      setTranscription(text);
      addToHistory({
        tool: ToolType.TRANSCRIPTION,
        content: text,
        summary: `Transcription: ${file.name}`,
        metadata: { fileName: file.name }
      });
      addToast('success', 'Transcription complete!');
    } catch (err: any) {addToast('error', typeof err === 'object' && err && 'message' in err ? err.message : 'Error transcribing file.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('success', 'Copied to clipboard');
  };

  const downloadText = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">AI Transcription</h2>
          <p className="text-slate-400">Convert audio and video files into accurate text.</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-purple-500/20 p-3 rounded-full text-amber-400">
          <Mic size={32} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="space-y-6">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl text-center">
            <div className="flex justify-end mb-4">
               <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Cost: {COST} Credits</span>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*,video/*"
              className="hidden" 
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all
                ${file 
                  ? 'border-purple-500 bg-purple-500/5' 
                  : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'}
              `}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-full ${file ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                  {file ? <FileAudio size={32} /> : <Upload size={32} />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-slate-200">
                    {file ? file.name : 'Upload Audio or Video'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'MP3, WAV, MP4, MPEG (Max 20MB)'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleTranscribe}
              disabled={!file || isLoading}
              className="mt-6 w-full bg-gradient-to-r from-sky-500 via-purple-500 to-amber-500 hover:from-sky-400 hover:via-purple-400 hover:to-amber-400 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <FileText size={18} />}
              <span>Start Transcription</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-medium text-slate-300">Transcription Result</h3>
            {transcription && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={downloadText}
                  className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  title="Save to file"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {transcription ? (
              <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                {transcription}
              </p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <FileText size={48} className="mb-4" />
                <p>Transcription will appear here...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};