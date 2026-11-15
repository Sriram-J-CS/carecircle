import React, { useState } from 'react';
import {
  Mic,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Sparkles,
  Volume2,
  ShoppingBag,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { agentApi, patientApi } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';

const PHARMACY_OPTIONS = [
  'Apollo Pharmacy',
  'MedPlus',
  'Tata 1mg',
  'PharmEasy',
  'Netmeds',
];

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  action?: {
    type: 'show_emergency' | 'ask_offer' | 'open_pill_camera' | 'none';
    checkin_id?: number;
    offer?: any;
    dose_id?: number;
  };
  offerHandled?: boolean;
}

interface VoiceAgentSheetProps {
  onOpenPillCamera?: (doseId?: number) => void;
  onOpenCheckin?: () => void;
  onOpenEmergency?: () => void;
}

export const VoiceAgentSheet: React.FC<VoiceAgentSheetProps> = ({
  onOpenPillCamera,
  onOpenCheckin,
  onOpenEmergency,
}) => {
  const { language, speak } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Pharmacy selection for inline offer
  const [selectedPharmacy, setSelectedPharmacy] = useState(PHARMACY_OPTIONS[0]);
  const [offerLoading, setOfferLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: 'Namaste! I am your CareCircle voice companion. How can I help you today?',
    },
  ]);

  const suggestionChips = [
    'I have a headache',
    'What is my next tablet?',
    'When is my appointment?',
    'I need help',
  ];

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: String(Date.now()), sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await agentApi.chat(text, language);
      const agentMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'agent',
        text: res.reply,
        action: res.action,
      };
      setMessages((prev) => [...prev, agentMsg]);
      speak(res.reply);

      // Handle Action Types
      if (res.action) {
        if (res.action.type === 'show_emergency') {
          if (onOpenEmergency) {
            onOpenEmergency();
          } else {
            window.dispatchEvent(new CustomEvent('carecircle-open-emergency'));
          }
        } else if (res.action.type === 'open_pill_camera' && onOpenPillCamera) {
          onOpenPillCamera(res.action.dose_id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Voice assistant error');
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      toast.error('Voice speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error(
            'Microphone access blocked. Tap the 🔒 icon in your browser address bar and switch Microphone to "Allow".',
            { duration: 6000 }
          );
        } else if (event.error !== 'no-speech') {
          toast.error('Voice input was interrupted. Please tap the mic to try again.');
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSendMessage(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('Voice input error:', e);
      setIsListening(false);
    }
  };

  // Inline response to offer inside assistant
  const handleInlineOffer = async (msgId: string, checkinId: number, accept: boolean) => {
    try {
      setOfferLoading(true);
      const res = await patientApi.respondOffer(checkinId, {
        accept,
        pharmacy: accept ? selectedPharmacy : undefined,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, offerHandled: true } : m))
      );

      if (accept) {
        const orderRef = res.order?.reference || 'Confirmed';
        const eta = res.order?.eta || '45 mins';
        const note = `Order placed with ${selectedPharmacy}! (Reference: ${orderRef}, ETA: ${eta}). Your family has been told.`;
        setMessages((prev) => [
          ...prev,
          { id: String(Date.now()), sender: 'agent', text: note },
        ]);
        speak(`Order confirmed with ${selectedPharmacy}. Your family has been told.`);
      } else {
        const note = 'I have informed your family.';
        setMessages((prev) => [
          ...prev,
          { id: String(Date.now()), sender: 'agent', text: note },
        ]);
        speak('I have informed your family.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not process offer');
    } finally {
      setOfferLoading(false);
    }
  };

  return (
    <>
      {/* Floating Microphone Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open voice assistant"
        className="fixed bottom-6 left-6 z-40 flex items-center justify-center gap-2 bg-teal-900 hover:bg-teal-850 text-white font-black text-xl px-5 py-4 rounded-full shadow-2xl border-4 border-white transition-transform active:scale-95 min-h-[64px]"
      >
        <Mic className="w-8 h-8 text-teal-300 animate-pulse" />
        <span className="hidden sm:inline">Ask Companion</span>
      </button>

      {/* Bottom Sheet Assistant */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-sheet-title"
          className="fixed inset-0 z-50 bg-teal-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border-t-4 sm:border-4 border-teal-600 shadow-2xl max-w-xl w-full h-[85vh] sm:h-[650px] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-warm-200 bg-teal-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-900 text-teal-200 flex items-center justify-center shadow">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h2 id="agent-sheet-title" className="text-2xl font-black text-teal-950">
                    CareCircle Voice Companion
                  </h2>
                  <p className="text-xs font-bold text-teal-850">
                    Tap the mic, speak in your language, or tap a suggestion
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
                className="p-2 rounded-xl text-warm-700 hover:bg-warm-100"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Browser Speech Support Warning Banner */}
            {!speechSupported && (
              <div className="bg-amber-100 border-b border-amber-300 p-3 text-sm font-bold text-amber-950 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <span>Speech recognition is not available in this browser. Chrome or Edge is recommended. You can type below!</span>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-warm-50">
              {messages.map((m) => (
                <div key={m.id} className="space-y-3">
                  <div className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.sender === 'agent' && (
                      <div className="w-8 h-8 rounded-full bg-teal-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1 shadow-sm">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-lg font-semibold leading-relaxed shadow-sm ${
                        m.sender === 'user'
                          ? 'bg-teal-900 text-white rounded-tr-none'
                          : 'bg-white text-warm-900 border-2 border-warm-200 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1 shadow-sm">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Inline Offer Card if action is ask_offer */}
                  {m.action?.type === 'ask_offer' && m.action.offer && !m.offerHandled && (
                    <div className="ml-10 p-4 rounded-2xl border-2 border-teal-500 bg-teal-50/70 shadow-md space-y-3">
                      <div className="flex items-center gap-2 font-black text-teal-950 text-lg">
                        <ShoppingBag className="w-6 h-6 text-teal-850" />
                        <span>Suggested Over-the-Counter Medicine:</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-teal-200 font-bold text-base text-teal-900">
                        {Array.isArray(m.action.offer.items)
                          ? m.action.offer.items.map((i: any) => typeof i === 'string' ? i : `${i.name} (${i.dosage || ''})`).join(', ')
                          : m.action.offer.items}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-warm-800 mb-1">
                          Pharmacy:
                        </label>
                        <select
                          value={selectedPharmacy}
                          onChange={(e) => setSelectedPharmacy(e.target.value)}
                          className="w-full p-2 rounded-lg border border-warm-300 font-bold text-sm bg-white"
                        >
                          {PHARMACY_OPTIONS.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleInlineOffer(m.id, m.action!.checkin_id!, true)}
                          disabled={offerLoading}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-teal-900 text-white font-black text-sm shadow hover:bg-teal-850"
                        >
                          Yes, order it
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInlineOffer(m.id, m.action!.checkin_id!, false)}
                          disabled={offerLoading}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-warm-300 text-warm-900 font-bold text-sm hover:bg-warm-100"
                        >
                          No, thanks
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-teal-900 font-bold p-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>CareCircle is thinking...</span>
                </div>
              )}
            </div>

            {/* Suggestion Chips */}
            <div className="px-4 py-2.5 bg-warm-100 border-t border-warm-200 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <Sparkles className="w-5 h-5 text-teal-850 flex-shrink-0" />
              {suggestionChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-warm-300 text-warm-800 text-sm font-bold hover:bg-teal-50 transition-colors shadow-sm"
                >
                  &ldquo;{chip}&rdquo;
                </button>
              ))}
            </div>

            {/* Voice Input & Text Input Footer */}
            <div className="p-3 sm:p-4 border-t-2 border-warm-200 bg-white flex items-center gap-2">
              <button
                type="button"
                onClick={startVoiceInput}
                aria-label="Tap to speak your query"
                className={`min-h-[56px] min-w-[56px] rounded-2xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse shadow-lg'
                    : 'bg-teal-100 hover:bg-teal-200 text-teal-950'
                }`}
              >
                <Mic className="w-7 h-7" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage(inputText);
                }}
                placeholder={isListening ? 'Listening to your voice...' : 'Type or tap mic to speak...'}
                className="flex-1 min-h-[56px] px-4 py-2.5 rounded-2xl border-2 border-warm-300 text-xl font-semibold bg-white text-warm-900"
              />

              <button
                type="button"
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || loading}
                aria-label="Send message"
                className="min-h-[56px] min-w-[56px] rounded-2xl bg-teal-900 hover:bg-teal-850 text-white flex items-center justify-center disabled:opacity-50 transition-colors shadow"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
