import React, { useState, useEffect } from 'react';
import { Speaker, Loader2, PlayCircle, StopCircle, Download, Copy, Check, ClipboardPaste } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';
import { useGlobal } from '../contexts/GlobalContext';
import { ToolType } from '../types';

const VOICES = [
  { id: 'Kore', name: 'Kore', gender: 'Feminine', desc: 'Balanced, clear, & professional' },
  { id: 'Puck', name: 'Puck', gender: 'Masculine', desc: 'High-pitched, energetic, & lively' },
  { id: 'Charon', name: 'Charon', gender: 'Masculine', desc: 'Deep, resonant, & cinematic' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Feminine', desc: 'Warm, soothing, & narrative' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Feminine', desc: 'Soft, airy, & conversational' }
];

export const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  
  // State for stable URL management
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { deductCredits, addToast, addToHistory, hasApiKey, setIsApiKeyModalOpen, history } = useGlobal();
  const COST = 3;

  // Restore Last Creation
  useEffect(() => {
    if (!text) {
      const lastItem = history.find(h => h.tool === ToolType.TTS);
      if (lastItem) {
        setText(lastItem.content);
        if (lastItem.metadata?.voice) setSelectedVoice(lastItem.metadata.voice);
      }
    }
  }, [history]);

  // Cleanup object URL when component unmounts or url changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setText(text);
        addToast('success', 'Pasted from clipboard!');
      }
    } catch (err: any) {addToast('error', typeof err === 'object' && err && 'message' in err ? err.message : 'Failed to read clipboard.');
    }
  };

  const handleGenerateAndPlay = async () => {
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      addToast('error', "Please connect your API Key first.");
      return;
    }

    if (!text.trim()) return;
    if (!deductCredits(COST)) return;
    
    // Stop any current playback
    if (audioSource) {
      audioSource.stop();
      setAudioSource(null);
      setIsPlaying(false);
    }

    setIsLoading(true);

    // Clear previous audio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const { buffer, blob } = await generateSpeech(text, selectedVoice);
      
      // Create a stable URL for this session
      const newUrl = URL.createObjectURL(blob);
      setAudioUrl(newUrl);
      
      addToHistory({
         tool: ToolType.TTS,
         content: text,
         summary: `Voice: ${selectedVoice}`,
         metadata: { voice: selectedVoice }
      });
      addToast('success', 'Audio generated successfully!');

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        setAudioSource(null);
      };

      source.start();
      setAudioSource(source);
      setIsPlaying(true);
    } catch (err: any) {console.error("TTS Error:", err);
      addToast('error', typeof err === 'object' && err && 'message' in err ? err.message : 'Failed to generate speech.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (audioSource) {
      audioSource.stop();
      setAudioSource(null);
      setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voiceover-${selectedVoice.toLowerCase()}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('success', 'Audio saved to downloads!');
  };

  const copyAudioUrl = () => {
    if (!audioUrl) return;
    navigator.clipboard.writeText(audioUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('success', 'Audio link copied!');
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">AI Text to Speech</h2>
          <p className="text-slate-400">Turn written content into lifelike voiceovers.</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500/20 to-blue-500/20 p-3 rounded-full text-sky-400">
          <Speaker size={32} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <label className="block text-sm font-medium text-slate-300 mb-3">Select Voice</label>
            <div className="space-y-2">
              {VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex flex-col gap-1
                    ${selectedVoice === voice.id 
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 border-sky-500 text-white shadow-lg' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'}
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      {voice.name}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        selectedVoice === voice.id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {voice.gender}
                      </span>
                    </span>
                    {selectedVoice === voice.id && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm"></div>}
                  </div>
                  <span className={`text-xs ${selectedVoice === voice.id ? 'text-sky-200' : 'text-slate-500'}`}>
                    {voice.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
               <label className="block text-sm font-medium text-slate-300">Script</label>
               <div className="flex items-center gap-3">
                 <button 
                   onClick={handlePaste}
                   className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
                 >
                   <ClipboardPaste size={12} /> Paste
                 </button>
                 <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Cost: {COST} Credits</span>
               </div>
            </div>
            
            <textarea
              className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-sky-500 outline-none resize-none min-h-[300px]"
              placeholder="Enter the text you want the AI to read aloud..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleGenerateAndPlay}
                disabled={isLoading || !text.trim() || isPlaying}
                className="flex-1 bg-gradient-to-r from-sky-500 via-purple-500 to-amber-500 hover:from-sky-400 hover:via-purple-400 hover:to-amber-400 disabled:opacity-50 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <PlayCircle />}
                <span>{isLoading ? 'Generating Audio...' : 'Generate & Play'}</span>
              </button>
              
              {isPlaying && (
                <button
                  onClick={handleStop}
                  className="px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <StopCircle />
                  <span>Stop</span>
                </button>
              )}

              {audioUrl && !isLoading && (
                <>
                 <button
                  onClick={downloadAudio}
                  className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  title="Save Audio"
                >
                  <Download size={20} />
                  <span>Save</span>
                </button>
                 <button
                  onClick={copyAudioUrl}
                  className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  title="Copy Audio URL"
                >
                  {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                  <span>Copy URL</span>
                </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};