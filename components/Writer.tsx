import React, { useState, useEffect } from 'react';
import { PenTool, Loader2, Copy, Check, Download, Sparkles } from 'lucide-react';
import { generateTextStream, enhancePrompt } from '../services/geminiService';
import { useGlobal } from '../contexts/GlobalContext';
import { ToolType } from '../types';
import ReactMarkdown from 'react-markdown';

export const Writer: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('Blog Post');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const { deductCredits, addToast, addToHistory, hasApiKey, setIsApiKeyModalOpen, history } = useGlobal();
  const COST = 1;

  // Restore Last Creation
  useEffect(() => {
    if (!output) {
      const lastItem = history.find(h => h.tool === ToolType.WRITER);
      if (lastItem) {
        setOutput(lastItem.content);
        if (lastItem.summary) {
           // Try to parse type and topic from summary "Type: Topic"
           const parts = lastItem.summary.split(': ');
           if (parts.length > 1) {
             setType(parts[0]);
             setTopic(parts.slice(1).join(': '));
           }
        }
      }
    }
  }, [history]);

  const handleEnhancePrompt = async () => {
    if (!topic.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(topic);
      setTopic(enhanced);
      addToast('success', 'Topic enhanced!');
    } catch (e: any) {addToast('error', typeof e === 'object' && e && 'message' in e ? e.message : 'Failed to enhance topic');
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

    if (!topic.trim()) return;
    if (!deductCredits(COST)) return;

    setIsLoading(true);
    setOutput('');
    let fullText = '';
    
    try {
      const prompt = `Write a ${type} about: ${topic}. Format it nicely with Markdown.`;
      
      // Capture usage statistics
      const usage = await generateTextStream(prompt, (chunk) => {
        setOutput((prev) => {
           fullText = prev + chunk;
           return fullText;
        });
      });
      
      addToHistory({
        tool: ToolType.WRITER,
        content: fullText,
        summary: `${type}: ${topic}`,
        metadata: { type },
        usage: usage // Store real usage
      });
      addToast('success', 'Content generated!');
    } catch (err: any) {console.error(err);
      addToast('error', typeof err === 'object' && err && 'message' in err ? err.message : 'An error occurred while generating text.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('success', 'Copied to clipboard');
  };

  const downloadText = () => {
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const contentTypes = ['Blog Post', 'Email', 'Social Media Caption', 'Ad Copy', 'Product Description', 'Video Script'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">AI Writer</h2>
          <p className="text-slate-400">Generate high-quality written content in seconds.</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500/20 to-purple-500/20 p-3 rounded-full text-purple-400">
          <PenTool size={32} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Content Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
              >
                {contentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">Topic / Description</label>
                <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Cost: {COST} Credits</span>
              </div>
              <div className="relative">
                <textarea
                  className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none resize-none pr-12"
                  placeholder="What should the AI write about?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <button 
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing || !topic.trim()}
                  className="absolute top-3 right-3 p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors"
                  title="Enhance Topic"
                >
                  {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              className="w-full bg-gradient-to-r from-sky-500 via-purple-500 to-amber-500 hover:from-sky-400 hover:via-purple-400 hover:to-amber-400 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <PenTool size={18} />}
              <span>Write Content</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl h-full min-h-[500px] flex flex-col">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
              <span className="text-sm font-medium text-slate-400">Generated Output</span>
              {output && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={downloadText}
                    className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    Save
                  </button>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 p-6 overflow-y-auto max-h-[600px] prose prose-invert prose-slate max-w-none">
              {output ? (
                <ReactMarkdown>{output}</ReactMarkdown>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                  <PenTool size={48} className="mb-4" />
                  <p>Content will appear here...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};