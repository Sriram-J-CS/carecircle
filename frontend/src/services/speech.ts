export type SupportedLanguage = 'en' | 'ta' | 'hi';

const LANG_CODE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
};

export function speak(text: string, lang: SupportedLanguage = 'en'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = LANG_CODE_MAP[lang] || 'en-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.95; // slightly slower, clearer for elderly
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang.startsWith(targetLang.slice(0, 2)) || v.lang === targetLang
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export interface SpeechRecognitionHandlers {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export function startListening(
  lang: SupportedLanguage = 'en',
  handlers: SpeechRecognitionHandlers
): { stop: () => void } {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (handlers.onError) {
      handlers.onError(new Error('Speech recognition not supported in this browser'));
    }
    return { stop: () => {} };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = LANG_CODE_MAP[lang] || 'en-IN';

  recognition.onresult = (event: any) => {
    let interimText = '';
    let finalText = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript;
      } else {
        interimText += event.results[i][0].transcript;
      }
    }

    const currentText = finalText || interimText;
    if (currentText) {
      handlers.onResult(currentText.trim(), Boolean(finalText));
    }
  };

  recognition.onerror = (event: any) => {
    if (handlers.onError) {
      handlers.onError(event.error);
    }
  };

  recognition.onend = () => {
    if (handlers.onEnd) {
      handlers.onEnd();
    }
  };

  try {
    recognition.start();
  } catch (e) {
    // Already started or blocked
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}
