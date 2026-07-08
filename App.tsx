import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { VideoCreator } from './components/VideoCreator';
import { ImageGenerator } from './components/ImageGenerator';
import { Writer } from './components/Writer';
import { Transcriber } from './components/Transcriber';
import { TextToSpeech } from './components/TextToSpeech';
import { AdminDashboard } from './components/AdminDashboard';
import { ToolType } from './types';
import { LayoutDashboard, ArrowRight, Star } from 'lucide-react';
import { GlobalProvider, useGlobal } from './contexts/GlobalContext';

const Dashboard: React.FC<{ onNavigate: (t: ToolType) => void }> = ({ onNavigate }) => {
  const { credits } = useGlobal();
  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section with Light Blue, Purple, Gold Theme */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 border border-white/10 p-10 md:p-16 text-center space-y-6 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-50%] left-[-20%] w-[500px] h-[500px] rounded-full bg-sky-500/20 blur-[120px]"></div>
          <div className="absolute bottom-[-50%] right-[-20%] w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[120px]"></div>
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-[100px]"></div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur-md text-amber-300 text-sm font-medium mb-4 shadow-lg">
            <Star size={14} fill="currentColor" />
            <span>Enterprise Grade AI Suite</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4 drop-shadow-lg">
             Unleash Your <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">Creative Potential</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform for generative media. Create studio-quality videos, images, copy, and voiceovers instantly.
          </p>
          
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
             <div className="bg-slate-900/60 border border-slate-700/50 px-6 py-4 rounded-xl flex items-center gap-3 backdrop-blur-md">
               <span className="text-slate-400 text-sm font-medium">Credits Available</span>
               <span className="text-2xl font-bold text-white flex items-center gap-1">
                 {credits}
                 <span className="text-amber-400 text-base">★</span>
               </span>
             </div>
             <button 
               onClick={() => onNavigate(ToolType.VIDEO)} 
               className="bg-gradient-to-r from-sky-500 via-purple-500 to-amber-500 text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 border border-white/10"
             >
               Start Creating Now
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { id: ToolType.VIDEO, title: 'AI Video Studio', desc: 'Turn text prompts into cinematic videos with Veo.', color: 'from-sky-500 to-blue-600' },
          { id: ToolType.IMAGE, title: 'AI Image Studio', desc: 'Generate and edit photorealistic images and art in seconds.', color: 'from-purple-500 to-violet-600' },
          { id: ToolType.WRITER, title: 'Copywriter', desc: 'Generate SEO blogs, emails, and marketing copy.', color: 'from-emerald-500 to-teal-600' },
          { id: ToolType.TRANSCRIPTION, title: 'Auto Transcribe', desc: 'Convert audio & video to accurate text transcripts.', color: 'from-amber-500 to-orange-600' },
          { id: ToolType.TTS, title: 'Voice Synthesis', desc: 'Human-like text-to-speech in multiple voices.', color: 'from-blue-500 to-cyan-600' },
        ].map((card) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className="group relative overflow-hidden bg-slate-800 border border-slate-700/50 p-8 rounded-3xl hover:border-slate-500 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 text-left h-full flex flex-col"
          >
            <div className={`absolute top-0 right-0 p-24 opacity-5 bg-gradient-to-br ${card.color} blur-3xl rounded-full transform translate-x-1/3 -translate-y-1/3 group-hover:opacity-15 transition-opacity duration-500`}></div>
            <h3 className="text-2xl font-bold text-white mb-2 relative z-10 group-hover:text-sky-300 transition-colors">{card.title}</h3>
            <p className="text-slate-400 mb-6 relative z-10 leading-relaxed flex-1">{card.desc}</p>
            <div className="flex items-center text-sm font-bold text-slate-500 group-hover:text-white transition-colors relative z-10 uppercase tracking-wider">
              Launch Tool <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform text-amber-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<ToolType>(ToolType.HOME);

  const renderTool = () => {
    switch (currentTool) {
      case ToolType.VIDEO: return <VideoCreator />;
      case ToolType.IMAGE: return <ImageGenerator initialTab="generate" onNavigate={setCurrentTool} />;
      case ToolType.WRITER: return <Writer />;
      case ToolType.TRANSCRIPTION: return <Transcriber />;
      case ToolType.TTS: return <TextToSpeech />;
      case ToolType.ADMIN: return <AdminDashboard />;
      default: return <Dashboard onNavigate={setCurrentTool} />;
    }
  };

  return (
    <Layout currentTool={currentTool} onNavigate={setCurrentTool}>
      {renderTool()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <GlobalProvider>
      <MainApp />
    </GlobalProvider>
  );
};

export default App;