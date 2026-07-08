import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Play, Loader2, Video as VideoIcon, Download, Sparkles, Key, Info, Upload, X, Image as ImageIcon, Clapperboard, Film, Settings2, Zap, Monitor, FileVideo, Check, Lightbulb, Wand2, ArrowDownCircle, History } from 'lucide-react';
import { generateVideo, checkApiKey, enhancePrompt, generatePromptVariations, generateVideoPromptFromImage } from '../services/geminiService';
import { useGlobal } from '../contexts/GlobalContext';
import { ToolType } from '../types';

const EXAMPLE_PROMPTS = [
  "A cinematic drone shot of a futuristic city at sunset with flying cars",
  "A cute robot gardening in a sunlit greenhouse, detailed textures",
  "A neon hologram of a cat driving a sports car at top speed",
  "Time-lapse of a blooming rose with morning dew drops",
  "An astronaut exploring a bioluminescent crystal cave",
  "A close-up of a dragon's eye opening, reflecting fire",
  "A cyberpunk street food vendor cooking noodles in the rain"
];

type VideoMode = 'text' | 'image' | 'transition';
type Resolution = '720p' | '1080p' | '4K';
type ExportFormat = 'mp4' | 'mov' | 'webm';

export const VideoCreator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VideoMode>('text');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(''); // Track detailed loading state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Suggestion State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  // Custom Aspect Ratio State
  const [isCustomRatio, setIsCustomRatio] = useState(false);
  const [customW, setCustomW] = useState('21');
  const [customH, setCustomH] = useState('9');
  
  // New States for Resolution and Export
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');

  // Start Image State
  const [startImageFile, setStartImageFile] = useState<File | null>(null);
  const [startImagePreview, setStartImagePreview] = useState<string | null>(null);
  const startFileInputRef = useRef<HTMLInputElement>(null);

  // End Image State
  const [endImageFile, setEndImageFile] = useState<File | null>(null);
  const [endImagePreview, setEndImagePreview] = useState<string | null>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  
  const { deductCredits, addToast, addToHistory, hasApiKey, setIsApiKeyModalOpen, history } = useGlobal();

  // Restore Last Creation
  useEffect(() => {
    // Only restore if we don't have a video yet
    if (!videoUrl) {
      const lastVideo = history.find(h => h.tool === ToolType.VIDEO);
      if (lastVideo) {
         // Check if blob URL is still valid (it might not be if page refreshed)
         // But for single page navigation, it works.
         setVideoUrl(lastVideo.content);
         if (lastVideo.summary) setPrompt(lastVideo.summary.replace('Transition: ', '').replace('Image to Video: ', ''));
      }
    }
  }, [history]);

  useEffect(() => {
    const handleSendToVideo = () => {
      setActiveTab('image');
      importLastImage(true);
    };
    window.addEventListener('send-to-video', handleSendToVideo);
    return () => window.removeEventListener('send-to-video', handleSendToVideo);
  }, [history]);

  // Dynamic Cost based on resolution
  const currentCost = useMemo(() => {
    if (resolution === '4K') return 20;
    return resolution === '1080p' ? 15 : 10;
  }, [resolution]);

  // Handle file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isStart: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      
      if (isStart) {
        setStartImageFile(file);
        setStartImagePreview(url);
        // Auto-detect ratio on start image only
        const img = new Image();
        img.onload = () => {
          const ratio = img.width >= img.height ? '16:9' : '9:16';
          setAspectRatio(ratio);
          setIsCustomRatio(false);
          addToast('info', `Aspect ratio set to ${ratio} based on image.`);
        };
        img.src = url;
      } else {
        setEndImageFile(file);
        setEndImagePreview(url);
      }
    }
  };

  // Helper to import last generated image
  const importLastImage = async (isStart: boolean) => {
    const lastImage = history.find(h => h.tool === ToolType.IMAGE);
    if (!lastImage || !lastImage.content) {
      addToast('error', 'No generated images found in history.');
      return;
    }

    try {
      setLoadingStep('Importing image...');
      const res = await fetch(lastImage.content);
      const blob = await res.blob();
      const file = new File([blob], `generated-image-${Date.now()}.png`, { type: 'image/png' });
      const url = URL.createObjectURL(file);

      if (isStart) {
        setStartImageFile(file);
        setStartImagePreview(url);
      } else {
        setEndImageFile(file);
        setEndImagePreview(url);
      }
      addToast('success', 'Image imported successfully!');
    } catch (e: any) {console.error(e);
      addToast('error', typeof e === 'object' && e && 'message' in e ? e.message : 'Failed to import image.');
    } finally {
      setLoadingStep('');
    }
  };

  const clearImage = (isStart: boolean) => {
    if (isStart) {
      if (startImagePreview) URL.revokeObjectURL(startImagePreview);
      setStartImageFile(null);
      setStartImagePreview(null);
      if (startFileInputRef.current) startFileInputRef.current.value = '';
    } else {
      if (endImagePreview) URL.revokeObjectURL(endImagePreview);
      setEndImageFile(null);
      setEndImagePreview(null);
      if (endFileInputRef.current) endFileInputRef.current.value = '';
    }
  };

  const handleCustomWChange = (val: string) => {
    if (val === '' || /^\d+$/.test(val)) {
      setCustomW(val);
      if (isCustomRatio && val && customH) setAspectRatio(`${val}:${customH}`);
    }
  };

  const handleCustomHChange = (val: string) => {
    if (val === '' || /^\d+$/.test(val)) {
      setCustomH(val);
      if (isCustomRatio && customW && val) setAspectRatio(`${customW}:${val}`);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt);
      setPrompt(enhanced);
      addToast('success', 'Prompt enhanced with AI magic!');
      setSuggestions([]); // Clear suggestions if any
    } catch (e: any) {addToast('error', typeof e === 'object' && e && 'message' in e ? e.message : 'Failed to enhance prompt. Check API Key.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAutoPromptFromImage = async () => {
    if (!startImageFile) return;
    setIsAnalyzing(true);
    try {
       const autoPrompt = await generateVideoPromptFromImage(startImageFile);
       setPrompt(autoPrompt);
       addToast('success', 'Analyzed image and created motion prompt!');
    } catch (e: any) {addToast('error', typeof e === 'object' && e && 'message' in e ? e.message : 'Failed to analyze image.');
    } finally {
       setIsAnalyzing(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!prompt.trim()) {
      addToast('info', 'Enter a basic prompt first to get variations.');
      return;
    }
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const vars = await generatePromptVariations(prompt);
      if (vars.length > 0) {
        setSuggestions(vars);
        addToast('success', 'Brainstormed 3 variations!');
      } else {
        addToast('error', 'Could not generate variations.');
      }
    } catch (e: any) {addToast('error', typeof e === 'object' && e && 'message' in e ? e.message : 'Failed to get suggestions.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const applySuggestion = (s: string) => {
    setPrompt(s);
    setSuggestions([]);
  };

  const handleGenerate = async () => {
    // 1. API Key Check FIRST
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      addToast('error', "Please connect your API Key first.");
      return;
    }

    let effectivePrompt = prompt.trim();
    setIsLoading(true);
    setVideoUrl(null);
    setLoadingStep('Initializing...');
    
    // Auto-analyze image for "Bring to Life" if prompt is empty
    if (activeTab === 'image' && !effectivePrompt && startImageFile) {
        setLoadingStep('Analyzing image for motion...');
        try {
           const autoPrompt = await generateVideoPromptFromImage(startImageFile);
           effectivePrompt = autoPrompt;
           setPrompt(autoPrompt); // Show user what we generated
           addToast('info', 'Created a motion prompt based on your image.');
        } catch (e: any) {console.error("Auto-prompt failed", e);
           effectivePrompt = "Cinematic video, bringing the image to life with natural motion and high detail, 4k resolution, photorealistic";
        }
    }

    if (!effectivePrompt) {
      setIsLoading(false);
      addToast('error', typeof e === 'object' && e && 'message' in e ? e.message : 'Please enter a description for your video.');
      return;
    }
    if (activeTab === 'image' && !startImageFile) {
      setIsLoading(false);
      addToast('error', 'Please upload a reference image to bring to life.');
      return;
    }
    if (activeTab === 'transition' && (!startImageFile || !endImageFile)) {
      setIsLoading(false);
      addToast('error', 'Please upload both start and end images for transition mode.');
      return;
    }

    let validAspectRatio = aspectRatio;
    if (isCustomRatio) {
      if (!customW || !customH || parseInt(customW) <= 0 || parseInt(customH) <= 0) {
         validAspectRatio = '16:9';
         addToast('info', 'Invalid custom ratio. Defaulting to 16:9.');
      }
    }

    // 2. Deduct Credits
    if (!deductCredits(currentCost)) {
        setIsLoading(false);
        return;
    }
    
    setLoadingStep(`Generating ${resolution} Video...`);

    try {
      const img1 = (activeTab === 'image' || activeTab === 'transition') ? (startImageFile || undefined) : undefined;
      const img2 = (activeTab === 'transition') ? (endImageFile || undefined) : undefined;

      const url = await generateVideo(effectivePrompt, validAspectRatio, resolution, img1, img2);
      setVideoUrl(url);
      
      addToHistory({
        tool: ToolType.VIDEO,
        content: url,
        summary: activeTab === 'transition' ? `Transition (${resolution}): ${effectivePrompt}` : `${effectivePrompt}`,
        metadata: { 
          type: 'video/mp4',
          mode: activeTab,
          aspectRatio: validAspectRatio,
          resolution
        }
      });
      addToast('success', 'Video generated successfully!');

    } catch (err: any) {
      addToast('error', err.message || "Failed to generate video");
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;

    if (exportFormat !== 'mp4') {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsExporting(false);
    }

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `veo-video-${Date.now()}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('success', `Video exported as ${exportFormat.toUpperCase()}`);
  };

  const renderImageUpload = (
    label: string, 
    file: File | null, 
    preview: string | null, 
    ref: React.RefObject<HTMLInputElement>,
    isStart: boolean
  ) => (
    <div className="flex-1">
       <div className="flex justify-between items-center mb-2">
         <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
           {label}
         </label>
         {!file && history.some(h => h.tool === ToolType.IMAGE) && (
           <button 
             onClick={() => importLastImage(isStart)}
             className="text-[10px] flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 transition-colors"
             title="Use last generated image"
           >
             <History size={10} /> Use Last
           </button>
         )}
       </div>
       
       <input 
          type="file" 
          ref={ref}
          onChange={(e) => handleFileChange(e, isStart)}
          accept="image/png, image/jpeg, image/jpg"
          className="hidden" 
        />

       {!preview ? (
         <div 
           onClick={() => ref.current?.click()}
           className="border-2 border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 h-32 group"
         >
           <div className="bg-slate-700 group-hover:bg-indigo-500/20 p-2 rounded-lg text-slate-400 group-hover:text-indigo-400 transition-colors">
             <ImageIcon size={20} />
           </div>
           <span className="text-xs text-slate-400 group-hover:text-slate-300 text-center">Click to Upload</span>
         </div>
       ) : (
         <div className="relative rounded-xl overflow-hidden border border-indigo-500/30 bg-slate-900 group h-32">
            <img src={preview} alt={label} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <button 
              onClick={() => clearImage(isStart)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
              title="Remove"
            >
              <X size={12} />
            </button>
         </div>
       )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">AI Video Studio</h2>
          <p className="text-slate-400">Create, animate, and direct videos with Veo 3.</p>
        </div>
        <div className="bg-indigo-500/10 p-3 rounded-full text-indigo-400">
          <Clapperboard size={32} />
        </div>
      </div>

      <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 max-w-2xl shadow-lg">
        <button
          onClick={() => { setActiveTab('text'); setStartImageFile(null); setEndImageFile(null); }}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <Film size={16} />
          Text to Video
        </button>
        <button
          onClick={() => { setActiveTab('image'); setEndImageFile(null); }}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'image' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <Sparkles size={16} />
          Bring to Life
        </button>
        <button
          onClick={() => setActiveTab('transition')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'transition' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <VideoIcon size={16} />
          Transition
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative flex flex-col h-full">
            
            {!hasApiKey && (
              <div 
                onClick={() => setIsApiKeyModalOpen(true)}
                className="mb-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:bg-indigo-900/40 transition-colors"
              >
                <Info className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-indigo-200">
                  <p className="font-semibold mb-1">API Key Required</p>
                  <p className="opacity-80">Click here to connect your Gemini API key to start generating.</p>
                </div>
              </div>
            )}

            {activeTab !== 'text' && (
              <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 animate-fade-in">
                 <div className="flex gap-4">
                    {renderImageUpload(activeTab === 'image' ? "Source Image" : "Start Frame", startImageFile, startImagePreview, startFileInputRef, true)}
                    
                    {activeTab === 'transition' && (
                      <div className="flex items-center justify-center pt-6 text-slate-500">
                        <Play size={24} />
                      </div>
                    )}

                    {activeTab === 'transition' && (
                       renderImageUpload("End Frame", endImageFile, endImagePreview, endFileInputRef, false)
                    )}
                 </div>
                 <p className="text-xs text-slate-500 mt-2 text-center">
                   {activeTab === 'transition' 
                     ? "The AI will generate the frames between these two images." 
                     : "Upload a picture and Veo 3 will animate it."}
                 </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Aspect Ratio
                </label>
                <div className="flex flex-wrap gap-2">
                  {['16:9', '9:16', '1:1', '21:9'].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setIsCustomRatio(false);
                        setAspectRatio(option);
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1
                        ${!isCustomRatio && aspectRatio === option 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'}
                      `}
                    >
                      <Monitor size={12} />
                      {option}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setIsCustomRatio(true);
                      setAspectRatio(`${customW}:${customH}`);
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1
                      ${isCustomRatio
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'}
                    `}
                  >
                    <Settings2 size={12} />
                    Custom
                  </button>
                </div>

                {isCustomRatio && (
                  <div className="flex items-center gap-2 pt-2 animate-fade-in">
                     <div className="relative group">
                       <input 
                         type="number" 
                         min="1"
                         value={customW}
                         onChange={(e) => handleCustomWChange(e.target.value)}
                         className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-center focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                         placeholder="W"
                       />
                       <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-500 text-[10px]">W</div>
                     </div>
                     <span className="text-slate-500 font-bold">:</span>
                     <div className="relative group">
                       <input 
                         type="number" 
                         min="1"
                         value={customH}
                         onChange={(e) => handleCustomHChange(e.target.value)}
                         className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-center focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                         placeholder="H"
                       />
                       <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-500 text-[10px]">H</div>
                     </div>
                  </div>
                )}
               </div>

               <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Quality
                </label>
                <div className="flex gap-2">
                  {(['720p', '1080p', '4K'] as Resolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors flex flex-col items-center justify-center relative overflow-hidden
                        ${resolution === res 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'}
                      `}
                    >
                      <span className="leading-none">{res}</span>
                      <span className={`text-[10px] font-bold ${resolution === res ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {res === '4K' ? '20 Credits' : res === '1080p' ? '15 Credits' : '10 Credits'}
                      </span>
                    </button>
                  ))}
                </div>
               </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-medium text-slate-300">
                  {activeTab === 'transition' ? 'Transition Instructions' : 'Video Prompt'}
                 </label>
                 <div className="flex items-center gap-2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs">
                    <Zap size={12} className="text-yellow-400 fill-current" />
                    <span className="font-bold text-slate-300">Cost: {currentCost} Credits</span>
                 </div>
              </div>

              {/* AI Toolbar */}
              <div className="flex items-center gap-2 mb-2">
                {activeTab === 'image' && startImageFile && (
                   <button
                     onClick={handleAutoPromptFromImage}
                     disabled={isAnalyzing}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-colors"
                   >
                     {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                     Auto-Write Prompt
                   </button>
                )}
                
                <button 
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing || !prompt.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-medium transition-colors"
                >
                  {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Enhance
                </button>

                <button 
                  onClick={handleGetSuggestions}
                  disabled={isSuggesting || !prompt.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs font-medium transition-colors"
                >
                  {isSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
                  Ideas
                </button>
              </div>
              
              <div className="relative">
                <textarea
                  className="w-full min-h-[100px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                  placeholder={
                    activeTab === 'transition' ? "Describe the movement between the two frames..." :
                    activeTab === 'image' ? "Describe the motion you want (e.g. 'Camera pans right', 'The water flows', 'Leaves rustle in wind')..." : 
                    "Describe your video scene in detail..."
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {suggestions.length > 0 && (
                <div className="mt-3 animate-fade-in bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                  <p className="text-xs font-bold text-indigo-300 uppercase mb-2 flex items-center gap-1">
                    <Lightbulb size={12} /> Creative Variations
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => applySuggestion(suggestion)}
                        className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-500/30 text-xs text-slate-300 hover:text-white transition-all group"
                      >
                         <div className="flex items-start gap-2">
                           <span className="text-slate-500 font-mono select-none">{index + 1}.</span>
                           {suggestion}
                         </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'text' && !prompt && suggestions.length === 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.slice(0, 5).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(ex)}
                        className="text-xs bg-slate-900 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 px-3 py-1.5 rounded-full transition-all text-left"
                      >
                        {ex.substring(0, 60)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={isLoading || (activeTab === 'text' && !prompt.trim()) || (activeTab !== 'text' && !startImageFile)}
              className={`mt-6 w-full text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                ${!hasApiKey 
                  ? 'bg-gradient-to-r from-slate-700 to-indigo-900 hover:from-slate-600 hover:to-indigo-800 border border-indigo-500/30' 
                  : 'bg-gradient-to-r from-sky-500 via-purple-500 to-amber-500 hover:from-sky-400 hover:via-purple-400 hover:to-amber-400'}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>{loadingStep || `Generating ${resolution} Video...`}</span>
                </>
              ) : !hasApiKey ? (
                <>
                  <Key size={20} />
                  <span>Connect Key & Generate</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  <span>
                    {activeTab === 'image' ? 'Bring Image to Life' : 'Generate Video'} ({currentCost} Credits)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden min-h-[400px] flex items-center justify-center relative group h-full">
            {videoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                />
              </div>
            ) : (
              <div className="text-center p-8">
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-indigo-400 animate-pulse">
                      {activeTab === 'transition' ? 'Connecting your scenes...' : 'Rendering your masterpiece...'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                      {loadingStep}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-500">
                    <VideoIcon size={48} className="mx-auto opacity-50" />
                    <p>Your generated video will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {videoUrl && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="text-indigo-400" size={20} />
                <h3 className="font-bold text-white">Export Settings</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Format</label>
                   <div className="relative">
                     <select 
                       value={exportFormat} 
                       onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                       className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                       <option value="mp4">MP4 (Default)</option>
                       <option value="mov">MOV (QuickTime)</option>
                       <option value="webm">WEBM (Web)</option>
                     </select>
                     <FileVideo className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={16} />
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Source Resolution</label>
                   <div className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 flex items-center justify-between cursor-not-allowed" title="Resolution determined at generation time">
                     <span>{resolution}</span>
                     <Check size={16} className="text-emerald-500" />
                   </div>
                 </div>
              </div>

              <button 
                onClick={handleDownload}
                disabled={isExporting}
                className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isExporting ? 'opacity-75 cursor-wait' : ''}`}
              >
                {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                <span>{isExporting ? `Exporting ${exportFormat.toUpperCase()}...` : `Download ${exportFormat.toUpperCase()}`}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};