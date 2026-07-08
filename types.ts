import React from 'react';

export enum ToolType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  WRITER = 'WRITER',
  TRANSCRIPTION = 'TRANSCRIPTION',
  TTS = 'TTS',
  HOME = 'HOME',
  ADMIN = 'ADMIN'
}

export interface NavItem {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface HistoryItem {
  id: string;
  tool: ToolType;
  content: string; // Text content, or URL/Base64 for media
  summary: string; // Short description or prompt
  timestamp: number;
  metadata?: any; // Extra info (voice name, aspect ratio, etc)
  usage?: { // Token usage tracking
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Transaction {
  id: string;
  planName: string;
  amount: number; // Credits amount
  price: number; // Dollar value
  date: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface PaymentLinks {
  starter: string;
  pro: string;
  business: string;
}

export interface GlobalContextType {
  credits: number;
  deductCredits: (amount: number) => boolean;
  addCredits: (amount: number, price?: number, planName?: string) => void;
  addToast: (type: ToastMessage['type'], message: string) => void;
  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  transactions: Transaction[];
  isHistoryOpen: boolean;
  setIsHistoryOpen: (isOpen: boolean) => void;
  isCreditsModalOpen: boolean;
  setIsCreditsModalOpen: (isOpen: boolean) => void;
  // API Key Management
  isApiKeyModalOpen: boolean;
  setIsApiKeyModalOpen: (isOpen: boolean) => void;
  hasApiKey: boolean;
  setHasApiKey: (hasKey: boolean) => void;
  // Payment Links
  paymentLinks: PaymentLinks;
  updatePaymentLinks: (links: PaymentLinks) => void;
}

// Global declaration for the AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}