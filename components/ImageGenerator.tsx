import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Image as ImageIcon, Loader2, Download, Wand2, Copy, Check, Sparkles, ImagePlus, Upload, X, Zap, Layers, Crown, Video, Share2 } from 'lucide-react';
import { generateImage, editImage, enhancePrompt } from '../services/geminiService';
import { useGlobal } from '../contexts/GlobalContext';
import { ToolType } from '../types';

interface ImageGeneratorProps {
  initialTab?: 'generate' | 'edit';
  onNavigate?: (tool: ToolType) => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ initialTab = 'generate', onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit'>(initialTab);

  // Generation State
  const [genPrompt, setGenPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [genImageUrl, setGenImageUrl] = useState<string | null>(null);

  // Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editOutputUrl, setEditOutputUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared State
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { deductCredits, addToast, addToHistory, hasApiKey, setIsApiKeyModalOpen, history } = useGlobal();

  // Restore Last Creation
  useEffect(() => {
    // Check if we already have an image shown
    if (!genImageUrl && !editOutputUrl) {
      const lastItem = history.find(h => h.tool === ToolType.IMAGE);
      if (lastItem) {
        if (lastItem.metadata?.mode === 'edit') {
           // It was an edit, restore to edit tab
           setEditOutputUrl(lastItem.content);
           setEditPrompt(lastItem.summary.replace('Edit: ', ''));
           // Note: We can't easily restore the input file object for preview without storing it, but we can show the output
           setActiveTab('edit');
        } else {
           // It was a generation
           setGenImageUrl(lastItem.content);
           setGenPrompt(lastItem.summary);
           if (lastItem.metadata?.aspectRatio) setAspectRatio(lastItem.metadata.aspectRatio);
           setActiveTab('generate');
        }
      }
    }
  }, [history]);

  // Dynamic Cost Calculation
  const currentCost = useMemo(() => {
    if (activeTab === 'edit') return 3;
    // Dynamic cost: 1:1 is standard (2), others are premium (3)
    return aspectRatio === '1:1' ? 2 : 3;
  }, [activeTab, aspectRatio]);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setEditFile(selectedFile);
      setEditPreview(URL.createObjectURL(selectedFile));
      setEditOutputUrl(null);
    }
  };

  const clearEditFile = () => {
    setEditFile(null);
    setEditPreview(null);
    setEditOutputUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEnhancePrompt = async (text: string, isEdit: boolean) => {
    if (!text.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(text);
      if (isEdit) {
        setEditPrompt(enhanced);
      } else {
        setGenPrompt(enhanced);
      }
      addToast('success', 'Prompt enhanced with AI magic!');
    } catch (e: any) {addToast('error', typeof e === 'object' && e && 'message' in e ? e.message : 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      addToast('error', "Please connect your API Key first.");
      return;
    }

    if (!genPrompt.trim()) return;
    if (!deductCredits(currentCost)) return;

    setIsLoading(true);
    setGenImageUrl(null);

    try {
      const url = await generateImage(genPrompt, aspectRatio);
      setGenImageUrl(url);
      addToHistory({
        tool: ToolType.IMAGE,
        content: url,
        summary: genPrompt,
        metadata: { aspectRatio, mode: 'generate' }
      });
      addToast('success', 'Image generated successfully!');
    } catch (err: any) {addToast('error', err.message || "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      addToast('error', typeof err === 'object' && err && 'message' in err ? err.message : 'Please connect your API Key first.');
      return;
    }

    if (!editPrompt.trim() || !editFile) return;
    if (!deductCredits(currentCost)) return;

    setIsLoading(true);
    setEditOutputUrl(null);

    try {
      const url = await editImage(editFile, editPrompt);
      setEditOutputUrl(url);
      addToHistory({
        tool: ToolType.IMAGE,
        content: url,
        summary: `Edit: ${editPrompt}`,
        metadata: { originalFile: editFile.name, mode: 'edit' }
      });
      addToast('success', 'Image edited successfully!');
    } catch (err: any) {addToast('error', err.message || "Failed to edit image");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (url: string | null) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('success', 'Image copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy image:', err);
      addToast('error', typeof err === 'object' && err && 'message' in err ? err.message : 'Failed to copy image');
    }
  };

  const handleShare = async (url: string | null) => {
    if (!url) return;
    if (!navigator.share) {
      addToast('error', 'Web Share API not supported on this browser.');
      return;
    }
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `ai-image-${Date.now()}.png`, { type: blob.type });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My AI Image',
          text: 'Check out this image I generated with AI Studio!',
          files: [file],
        });
        addToast('success', 'Shared successfully!');
      } else {
        addToast('error', 'Sharing files is not supported on this device.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         console.error('Failed to share:', err);
         addToast('error', 'Failed to share image');
      }
    }
  };

  const currentImageUrl = activeTab === 'generate' ? genImageUrl : editOutputUrl;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">AI Image Studio</h2>
          <p className="text-slate-400">Create and transform visuals with professional AI tools.</p>
        </div>
        <div className={`p-3 rounded-full bg-purple-500/10 text-purple-400`}>
          {activeTab === 'generate' ? <ImageIcon size={32} /> : <ImagePlus size={32} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 max-w-md">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'generate' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <Wand2 size={16} />
          Text to Image
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'edit' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <ImagePlus size={16} />
          Image Editor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 transition-all">
            
            {activeTab === 'edit' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-slate-300 mb-2">Source Image</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden" 
                />
                {!editPreview ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 hover:border-purple-500 hover:bg-purple-500/5 rounded-xl p-8 cursor-pointer transition-all flex flex-col items-center justify-center text-center h-40 group"
                  >
                    <div className="p-3 bg-slate-700 rounded-full text-slate-400 group-hover:bg-purple-500/20 group-hover:text-purple-400 mb-3 transition-colors">
                       <Upload size={24} />
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-300">Click to upload image</span>
                    <span className="text-xs text-slate-600 mt-1">PNG, JPG up to 10MB</span>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-purple-500/30 bg-slate-900 group h-48 flex items-center justify-center">
                    <img src={editPreview} alt="Preview" className="h-full w-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={clearEditFile}
                        className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium backdrop-blur-sm"
                      >
                        <X size={16} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-slate-300">
                  {activeTab === 'generate' ? 'Prompt' : 'Edit Instructions'}
                </label>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-200">
                   <div className="p-1 rounded-full bg-amber-400">
                      <Zap size={10} fill="currentColor" className="text-black" />
                   </div>
                   <span className="text-sm font-bold">{currentCost} Credits</span>
                   <span className="text-[10px] opacity-60 uppercase tracking-wider font-medium ml-1 hidden sm:inline-block">
                     {activeTab === 'generate' && aspectRatio !== '1:1' ? 'Premium' : 'Standard'}
                   </span>
                </div>
              </div>
              <div className="relative">
                <textarea
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none pr-12 transition-all"
                  placeholder={activeTab === 'generate' 
                    ? "A futuristic city with flying cars, neon lights, cyberpunk style..." 
                    : "Make it look like a van gogh painting, add a hat, change background to mars..."}
                  value={activeTab === 'generate' ? genPrompt : editPrompt}
                  onChange={(e) => activeTab === 'generate' ? setGenPrompt(e.target.value) : setEditPrompt(e.target.value)}
                />
                 <button 
                  onClick={() => handleEnhancePrompt(activeTab === 'generate' ? genPrompt : editPrompt, activeTab === 'edit')}
                  disabled={isEnhancing || !(activeTab === 'generate' ? genPrompt : editPrompt).trim()}
                  className="absolute top-3 right-3 p-2 rounded-lg transition-colors bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
                  title="Enhance Prompt"
                >
                  {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                </button>
              </div>
            </div>

            {activeTab === 'generate' && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={16} className="text-slate-400" />
                  <label className="block text-sm font-medium text-slate-300">
                    Aspect Ratio
                  </label>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {['1:1', '16:9', '9:16'].map((ratio) => {
                    const ratioCost = ratio === '1:1' ? 2 : 3;
                    const isSelected = aspectRatio === ratio;
                    const isPremium = ratio !== '1:1';

                    return (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden group
                          ${isSelected 
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg ring-1 ring-purple-400' 
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}
                        `}
                      >
                         {isPremium && (
                           <div className={`absolute top-0 right-0 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-bl-lg flex items-center gap-0.5
                             ${isSelected ? 'bg-purple-800 text-purple-200' : 'bg-slate-800 text-slate-500'}
                           `}>
                             {isSelected && <Crown size={8} />}
                             Premium
                           </div>
                        )}
                        <span className="text-base font-bold mt-1">{ratio}</span>
                        <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-full
                           ${isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}
                        `}>
                           <Zap size={10} fill="currentColor" /> {ratioCost}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <button
              onClick={activeTab === 'generate' ? handleGenerate : handleEdit}
              disabled={isLoading || !(activeTab === 'generate' ? genPrompt : (editPrompt && editFile))}
              className={`w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg bg-gradient-to-r from-sky-500 via-purple-500 to-amber-500 hover:from-sky-400 hover:via-purple-400 hover:to-amber-400`}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
              <span>
                {activeTab === 'generate' ? 'Generate Image' : 'Generate Edit'}
              </span>
              <span className="bg-black/20 px-2 py-0.5 rounded text-xs">
                -{currentCost} Credits
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl min-h-[500px] flex items-center justify-center p-4 relative group h-full">
            {currentImageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={currentImageUrl} 
                  alt="Generated Result" 
                  className="max-w-full max-h-[600px] rounded-lg shadow-2xl object-contain"
                />
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onNavigate && (
                    <button 
                      onClick={() => {
                        onNavigate(ToolType.VIDEO);
                        setTimeout(() => window.dispatchEvent(new CustomEvent('send-to-video')), 100);
                      }}
                      className="bg-slate-900/80 hover:bg-sky-600 text-white p-3 rounded-full backdrop-blur-sm border border-white/10 transition-colors"
                      title="Send to AI Video"
                    >
                      <Video size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => copyToClipboard(currentImageUrl)}
                    className="bg-slate-900/80 hover:bg-slate-800 text-white p-3 rounded-full backdrop-blur-sm border border-white/10"
                    title="Copy Image"
                  >
                    {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                  </button>
                  <button 
                    onClick={() => handleShare(currentImageUrl)}
                    className="bg-slate-900/80 hover:bg-slate-800 text-white p-3 rounded-full backdrop-blur-sm border border-white/10 transition-colors"
                    title="Share Image"
                  >
                    <Share2 size={20} />
                  </button>
                  <a 
                    href={currentImageUrl} 
                    download={`ai-image-${Date.now()}.png`}
                    className="bg-slate-900/80 hover:bg-purple-600 text-white p-3 rounded-full backdrop-blur-sm border border-white/10 transition-colors"
                    title="Download"
                  >
                    <Download size={20} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto border-purple-500"></div>
                    <p className="text-purple-400 animate-pulse">
                      {activeTab === 'generate' ? 'Dreaming up your image...' : 'Transforming your image...'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 text-slate-500">
                    <div className="flex justify-center gap-4 opacity-30">
                       <ImageIcon size={40} />
                       {activeTab === 'edit' && <Sparkles size={40} />}
                    </div>
                    <p>Your {activeTab === 'generate' ? 'generated artwork' : 'edited masterpiece'} will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};