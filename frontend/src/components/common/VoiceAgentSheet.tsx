import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Volume2, X, Sparkles, MessageCircle } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { speak, stopSpeaking, startListening } from '../../services/speech';
import { api } from '../../services/api';

interface VoiceAgentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckin?: () => void;
  onTriggerSOS?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export const VoiceAgentSheet: React.FC<VoiceAgentSheetProps> = ({
  isOpen,
  onClose,
  onOpenCheckin,
  onTriggerSOS,
}) => {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: language === 'ta'
        ? 'வணக்கம்! நான் உங்கள் கேர்சர்க்கிள் உதவியாளர். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?'
        : language === 'hi'
        ? 'नमस्ते! मैं आपका केयरसर्कल सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?'
        : 'Hello! I am your CareCircle companion. How can I help you today? You can ask about medicines, health, or your family.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Clean up listening and speaking on close
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
      stopSpeaking();
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current = startListening(language, {
        onResult: (text, isFinal) => {
          setInputText(text);
          if (isFinal) {
            handleSendMessage(text);
          }
        },
        onError: () => {
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }

    const newMsgs: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMsgs);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await api.chatAgent(text, language);
      const reply = res.reply || "I'm right here with you.";

      setMessages([...newMsgs, { role: 'assistant', text: reply }]);
      speak(reply, language);

      // Handle server actions
      if (res.action) {
        if (res.action.kind === 'sos' && onTriggerSOS) {
          onTriggerSOS();
        } else if (res.action.kind === 'checkin' && onOpenCheckin) {
          onClose();
          onOpenCheckin();
        }
      }
    } catch {
      const errReply = 'I had trouble connecting. Please tap the SOS button if this is an emergency.';
      setMessages([...newMsgs, { role: 'assistant', text: errReply }]);
      speak(errReply, language);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="CareCircle Voice Companion">
      <div className="flex flex-col h-[65vh] max-h-[550px]">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl p-4 text-base sm:text-lg leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-teal text-white rounded-br-xs'
                    : 'bg-sand/40 dark:bg-teal-900/50 text-ink dark:text-paper rounded-bl-xs border border-sand dark:border-teal-800'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-sand/40 dark:bg-teal-900/50 rounded-3xl p-4 text-sm text-ink/70 dark:text-sand/70 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-teal animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-teal animate-bounce delay-200" />
                <span className="ml-2 font-serif">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-sand dark:border-teal-900/60 p-4 bg-paper dark:bg-ink">
          <div className="flex items-center gap-3">
            {/* Mic Button with Pulse */}
            <button
              onClick={toggleListening}
              className={`relative p-4 rounded-full transition-all shrink-0 ${
                isListening
                  ? 'bg-clay text-white shadow-lg scale-110'
                  : 'bg-mint dark:bg-teal-900 text-teal dark:text-mint hover:bg-mint/80'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start speaking'}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full border-2 border-clay animate-ping" />
              )}
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? 'Listening...' : 'Type or speak to CareCircle...'}
                className="w-full text-base sm:text-lg px-4 py-3.5 rounded-2xl bg-sand/30 dark:bg-teal-900/40 border border-sand dark:border-teal-700 text-ink dark:text-paper placeholder:text-ink/40 dark:placeholder:text-sand/40 focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="p-3.5 rounded-2xl bg-teal text-white hover:bg-teal-700 disabled:opacity-40 transition-colors shrink-0"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2 text-center text-xs text-ink/50 dark:text-sand/50">
            Spoken responses are read aloud automatically in your language.
          </div>
        </div>
      </div>
    </Sheet>
  );
};
