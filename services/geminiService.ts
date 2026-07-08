// API Client for Gemini Server Routes

export const setCustomApiKey = (key: string) => {
  // No-op for server-side key
};

export const clearCustomApiKey = () => {
  // No-op
};

// Check if a valid key is available (always true to let server reject)
export const checkApiKey = async (): Promise<boolean> => {
  return true;
};

// --- SINGLETON AUDIO CONTEXT ---
// Reuse a single AudioContext to prevent browser limit errors (max 6 contexts)
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
};

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.toLowerCase().includes("text/html")) {
    const clone = res.clone();
    const text = await clone.text();
    if (text.includes("aistudio_auth_flow_may_set_cookies") || text.toLowerCase().includes("<!doctype html>")) {
      const msg = "Authentication required: Your browser is blocking third-party cookies in this iframe. Please click the ↗ button at the top right to open the app in a new tab to authenticate.";
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth-error', { detail: msg }));
      throw new Error(msg);
    }
  }
  return res;
}

async function parseResponse(res: Response) {
  const clone = res.clone();
  try {
    return await clone.json();
  } catch (e) {
    throw new Error(await res.text());
  }
}

export const enhancePrompt = async (originalPrompt: string): Promise<string> => {
  const res = await apiFetch('/api/enhance-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: originalPrompt })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await parseResponse(res);
  return data.text || originalPrompt;
};

export const generatePromptVariations = async (originalPrompt: string): Promise<string[]> => {
  const res = await apiFetch('/api/video-prompt-variations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: originalPrompt })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await parseResponse(res);
  try {
    return JSON.parse(data.text || '[]');
  } catch (e) {
    console.error("Failed to parse variations", e);
    return [];
  }
};

export const generateVideoPromptFromImage = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  const res = await apiFetch('/api/video-prompt-from-image', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await parseResponse(res);
  return data.text || "";
};

// Helper: Get Image Dimensions
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// 1. Video Creator (Veo)
export const generateVideo = async (
  prompt: string, 
  aspectRatio: string, 
  resolution: '720p' | '1080p' | '4K',
  imageFile?: File, 
  endImageFile?: File
): Promise<string> => {
  const validateFile = (file: File, label: string) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error(`Invalid ${label} type: ${file.type}. Only PNG and JPEG images are supported.`);
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${label} file is too large. Please use an image under 10MB.`);
    }
  };

  if (imageFile) validateFile(imageFile, "Start Image");
  if (endImageFile) validateFile(endImageFile, "End Image");

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('aspectRatio', aspectRatio);
  formData.append('resolution', resolution);
  if (imageFile) formData.append('image', imageFile);
  if (endImageFile) formData.append('endImage', endImageFile);

  const startRes = await apiFetch('/api/generate-video', {
    method: 'POST',
    body: formData
  });
  if (!startRes.ok) {
    let errText;
    try {
      const errBody = await startRes.clone().json();
      errText = errBody.error || errBody.message;
    } catch {
      errText = await startRes.text();
    }
    throw new Error(errText || startRes.statusText);
  }
  const { operationName } = await parseResponse(startRes);
  
  if (!operationName) throw new Error("Video generation failed to start.");

  // Retry logic / polling
  const startTime = Date.now();
  const TIMEOUT = 300000; // 5 mins

  while (true) {
    if (Date.now() - startTime > TIMEOUT) {
      throw new Error("Video generation timed out.");
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      const pollRes = await apiFetch('/api/video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName })
      });
      if (!pollRes.ok) continue;
      const pollData = await parseResponse(pollRes);
      
      if (pollData.error) {
        throw new Error(`Video generation failed: ${pollData.error.message || 'Unknown error'}`);
      }
      
      if (pollData.done) {
        break;
      }
    } catch (pollError) {
      console.warn("Polling error (retrying):", pollError);
    }
  }

  // Download video blob
  const downloadRes = await apiFetch('/api/video-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName })
  });
  
  if (!downloadRes.ok) {
    let errorText;
    try {
      const errBody = await downloadRes.clone().json();
      errorText = errBody.error || errBody.message;
    } catch (e) {
      errorText = await downloadRes.text();
    }
    throw new Error(`Failed to download video: ${errorText || downloadRes.statusText}`);
  }
  
  const blob = await downloadRes.blob();
  return URL.createObjectURL(blob);
};

// 2. Image Generator
export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
  const res = await apiFetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio })
  });
  if (!res.ok) {
    const text = await res.text();
    let errorMsg = text;
    try { errorMsg = JSON.parse(text).error; } catch(e) {}
    throw new Error(errorMsg || "Failed to generate image.");
  }
  const data = await parseResponse(res);
  if (data.error) throw new Error(data.error);
  return data.image;
};

// 2.5 Image Editor
export const editImage = async (imageFile: File, prompt: string): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('prompt', prompt);

  const res = await apiFetch('/api/edit-image', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const text = await res.text();
    let errorMsg = text;
    try { errorMsg = JSON.parse(text).error; } catch(e) {}
    throw new Error(errorMsg || "Failed to edit image.");
  }
  const data = await parseResponse(res);
  if (data.error) throw new Error(data.error);
  return data.image;
};

// 3. AI Writer
export const generateTextStream = async (
  prompt: string, 
  onChunk: (text: string) => void
): Promise<{ promptTokens: number; completionTokens: number; totalTokens: number }> => {
  const res = await apiFetch('/api/generate-text-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  
  if (!res.ok) throw new Error("Failed to start stream");
  
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let buffer = '';
  
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const event of events) {
        if (event.startsWith('data: ')) {
           try {
              const data = JSON.parse(event.slice(6));
              if (data.text) onChunk(data.text);
              if (data.usage) usage = data.usage;
           } catch(e) {}
        }
      }
    }
  }
  return usage;
};

// 4. Transcription
export const transcribeAudio = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('audio', file);
  
  const res = await apiFetch('/api/transcribe', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await parseResponse(res);
  return data.text || "No transcription available.";
};

// 5. Text-to-Speech
const createWavBlob = (samples: Uint8Array, sampleRate: number): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length, true);
  new Uint8Array(buffer, 44).set(samples);

  return new Blob([buffer], { type: 'audio/wav' });
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<{ buffer: AudioBuffer, blob: Blob }> => {
  const res = await apiFetch('/api/generate-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await parseResponse(res);
  
  const base64Audio = data.audio;
  if (!base64Audio) throw new Error("No audio generated.");

  // Decode audio
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Use Shared AudioContext for decoding
  const ctx = getAudioContext();
  
  // Create buffer manually to avoid decodeAudioData limitations on raw PCM/some envs
  const dataInt16 = new Int16Array(bytes.buffer);
  const numChannels = 1;
  const sampleRate = 24000;
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }

  const wavBlob = createWavBlob(bytes, 24000);
  return { buffer, blob: wavBlob };
};