import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage } from '../services/speech';

interface Translations {
  [key: string]: {
    en: string;
    ta: string;
    hi: string;
  };
}

export const DICTIONARY: Translations = {
  // Common
  app_name: { en: 'CareCircle', ta: 'கேர்சர்க்கிள்', hi: 'केयरसर्कल' },
  tagline: { en: 'Caring for your loved ones, every single hour', ta: 'உங்கள் அன்புக்குரியவர்களை ஒவ்வொரு மணி நேரமும் கவனித்தல்', hi: 'हर घंटे अपने प्रियजनों की देखभाल' },
  sign_in: { en: 'Sign In', ta: 'உள்நுழையவும்', hi: 'साइन इन करें' },
  sign_out: { en: 'Sign Out', ta: 'வெளியேறவும்', hi: 'साइन आउट' },
  register: { en: 'Create Account', ta: 'கணக்கு உருவாக்கவும்', hi: 'खाता बनाएं' },
  save: { en: 'Save', ta: 'சேமிக்க', hi: 'सहेजें' },
  cancel: { en: 'Cancel', ta: 'ரத்து செய்', hi: 'रद्द करें' },
  back: { en: 'Back', ta: 'பின்செல்', hi: 'वापस' },
  next: { en: 'Next', ta: 'அடுத்து', hi: 'आगे' },
  loading: { en: 'Loading...', ta: 'ஏற்றுகிறது...', hi: 'लोड हो रहा है...' },
  offline_notice: { en: 'You are currently offline. Showing saved data.', ta: 'நீங்கள் ஆஃப்லைனில் உள்ளீர்கள். சேமிக்கப்பட்ட தரவு காட்டப்படுகிறது.', hi: 'आप वर्तमान में ऑफ़लाइन हैं। सहेजा गया डेटा दिखाया जा रहा है।' },

  // Greetings & Home
  good_morning: { en: 'Good morning', ta: 'காலை வணக்கம்', hi: 'सुप्रभात' },
  good_afternoon: { en: 'Good afternoon', ta: 'மதிய வணக்கம்', hi: 'शुभ दोपहर' },
  good_evening: { en: 'Good evening', ta: 'மாலை வணக்கம்', hi: 'शुभ संध्या' },
  next_tablet: { en: 'Next Tablet', ta: 'அடுத்த மாத்திரை', hi: 'अगली दवाई' },
  todays_medicines: { en: "Today's Medicines", ta: 'இன்றைய மருந்துகள்', hi: 'आज की दवाइयां' },
  how_do_you_feel: { en: 'How do you feel?', ta: 'நீங்கள் எப்படி உணர்கிறீர்கள்?', hi: 'आप कैसा महसूस कर रहे हैं?' },
  appointments: { en: 'Appointments', ta: 'மருத்துவர் சந்திப்புகள்', hi: 'अपॉइंटमेंट्स' },
  todays_walk: { en: "Today's Walk", ta: 'இன்றைய நடை', hi: 'आज की सैर' },
  call_family: { en: 'Call My Family', ta: 'குடும்பத்தினரை அழைக்க', hi: 'परिवार को कॉल करें' },
  sos_help: { en: 'SOS Emergency Help', ta: 'அவசர உதவி (SOS)', hi: 'आपातकालीन सहायता (SOS)' },

  // Medicine & Pill Camera
  time_for_medicine: { en: 'Time for your medicine', ta: 'உங்கள் மருந்துக்கான நேரம்', hi: 'आपकी दवाई का समय' },
  take_it_now: { en: 'Take it now', ta: 'இப்போது உட்கொள்ளவும்', hi: 'अभी लें' },
  remind_in_10: { en: 'Remind me in 10 minutes', ta: '10 நிமிடங்களில் நினைவூட்டு', hi: '10 मिनट बाद याद दिलाएं' },
  pill_camera_instruction: { en: 'Show the tablet to the camera, take it, and drink water.', ta: 'மாத்திரையை கேமராவில் காட்டி, விழுங்கி, தண்ணீர் குடிக்கவும்.', hi: 'कैमरे में गोली दिखाएं, लें और पानी पिएं।' },
  recording_verification: { en: 'Recording verification...', ta: 'பதிவு செய்கிறது...', hi: 'सत्यापन रिकॉर्ड हो रहा है...' },
  dose_confirmed: { en: 'Dose recorded successfully!', ta: 'மருந்து வெற்றிகரமாக பதிவு செய்யப்பட்டது!', hi: 'दवाई सफलतापूर्वक दर्ज की गई!' },
  before_food: { en: 'Before food', ta: 'உணவுக்கு முன்', hi: 'खाने से पहले' },
  after_food: { en: 'After food', ta: 'உணவுக்கு பின்', hi: 'खाने के बाद' },
  with_food: { en: 'With food', ta: 'உணவுடன்', hi: 'खाने के साथ' },

  // Health Check-in
  health_checkin: { en: 'Health Check-in', ta: 'உடல்நலப் பரிசோதனை', hi: 'स्वास्थ्य जांच' },
  feeling_question: { en: 'How are you feeling right now?', ta: 'இப்போது உங்கள் உடல்நிலை எப்படி இருக்கிறது?', hi: 'अभी आप कैसा महसूस कर रहे हैं?' },
  pain_question: { en: 'Are you feeling any pain?', ta: 'ஏதேனும் வலி உள்ளதா?', hi: 'क्या आपको कोई दर्द है?' },
  symptoms_question: { en: 'Do you have any of these symptoms?', ta: 'இந்த அறிகுறிகள் ஏதேனும் உள்ளதா?', hi: 'क्या आपको इनमें से कोई लक्षण हैं?' },
  none_of_these: { en: 'None of these', ta: 'இவற்றில் எதுவும் இல்லை', hi: 'इनमें से कोई नहीं' },
  tell_me_more: { en: 'Anything else? Tell me in words or voice.', ta: 'வேறு ஏதேனும் உள்ளதா? குரலில் சொல்லுங்கள்.', hi: 'कुछ और? बोलकर या लिखकर बताएं।' },
  submit_checkin: { en: 'Submit Check-in', ta: 'பரிசோதனையை சமர்ப்பிக்கவும்', hi: 'जांच जमा करें' },
  checkin_good: { en: 'Everything looks great!', ta: 'அனைத்தும் சீராக உள்ளது!', hi: 'सब कुछ बहुत अच्छा लग रहा है!' },
  checkin_attention: { en: 'Let us pay attention to your symptoms', ta: 'உங்கள் அறிகுறிகளைக் கவனிப்போம்', hi: 'आइए आपके लक्षणों पर ध्यान दें' },
  checkin_emergency: { en: 'Immediate help is being arranged', ta: 'உடனடி உதவி ஏற்பாடு செய்யப்படுகிறது', hi: 'तत्काल सहायता की व्यवस्था की जा रही है' },
  yes_order: { en: 'Yes, order it', ta: 'ஆம், ஆர்டர் செய்யவும்', hi: 'हाँ, ऑर्डर करें' },
  no_thanks: { en: 'No, thanks', ta: 'வேண்டாம், நன்றி', hi: 'नहीं, धन्यवाद' },

  // Family & Doctor
  all_good: { en: 'All good', ta: 'அனைத்தும் நலம்', hi: 'सब ठीक है' },
  needs_attention: { en: 'Needs attention', ta: 'கவனம் தேவை', hi: 'ध्यान देने की आवश्यकता है' },
  emergency: { en: 'Emergency', ta: 'அவசரம்', hi: 'आपातकाल' },
  im_on_it: { en: "I'm on it", ta: 'நான் கவனிக்கிறேன்', hi: 'मैं देख रहा हूँ' },
  resolved: { en: 'Resolved', ta: 'தீர்க்கப்பட்டது', hi: 'समाधान हो गया' },
  adherence_rate: { en: 'Medicine Adherence', ta: 'மருந்து கடைபிடிப்பு விகிதம்', hi: 'दवा पालन दर' },
  risk_trend: { en: '30-Day Health Trend', ta: '30 நாள் உடல்நலப் போக்கு', hi: '30-दिवसीय स्वास्थ्य रुझान' },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('carecircle_lang');
    return (saved as SupportedLanguage) || 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('carecircle_lang', lang);
  };

  const t = (key: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return key;
    return entry[language] || entry.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
