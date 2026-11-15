import React, { createContext, useContext, useEffect, useState } from 'react';

export type LanguageCode = 'en' | 'ta' | 'hi';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  speechLocale: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', speechLocale: 'en-IN' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', speechLocale: 'ta-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechLocale: 'hi-IN' },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    tagline: 'Never alone. Always cared for.',
    signIn: 'Sign In',
    register: 'New here? Register',
    signOut: 'Sign Out',
    disclaimer: 'CareCircle does not diagnose. Not medical advice.',
    sos: 'EMERGENCY SOS',
    callingSos: 'Sending emergency alert...',
    whoAreYou: 'Who are you?',
    patient: 'Patient',
    patientDesc: 'I am an elder living at home',
    doctor: 'Doctor',
    doctorDesc: 'I care for my registered patients',
    relative: 'Family Member',
    relativeDesc: 'I look after my parents or relatives',
    faceId: 'Face ID',
    emailPass: 'Email & Password',
    lookAtCamera: 'Look directly at the camera',
    faceFound: 'Face detected!',
    faceNotFound: 'Looking for your face...',
    captureFace: 'Scan Face',
    orUseEmail: 'We could not recognise you — use email and password',
    email: 'Email address',
    password: 'Password',
    name: 'Full Name',
    age: 'Age (years)',
    phone: 'Mobile number (10 digits)',
    prefLang: 'Preferred Language',
    next: 'Next Step',
    back: 'Back',
    skip: 'Skip this step',
    finish: 'Complete Registration',
    step: 'Step',
    of: 'of',
    emergencyContacts: 'Emergency Contacts',
    whoToCall: 'Who should we call in an emergency?',
    addContact: '+ Add Another Contact',
    contactName: 'Contact Name',
    contactPhone: 'Mobile Number',
    relation: 'Relationship',
    allowAppAccess: 'Let them see my health dashboard',
    healthConditions: 'Your Health Details',
    allergies: 'Allergies (medicines/food)',
    homeAddress: 'Home Address',
    city: 'City',
    state: 'State',
    pincode: 'PIN Code',
    hospitalAndDoctors: 'Your Hospital & Doctors',
    searchHospital: 'Search hospital or tap an initial below',
    selectHospital: 'Select Hospital',
    doctorsAtHospital: 'Doctors at this hospital',
    medicines: 'Your Daily Medicines',
    searchMedicine: 'Search medicine name...',
    dosage: 'Dosage (e.g. 1 tablet)',
    whenToTake: 'When to take',
    morning: 'Morning 08:00',
    afternoon: 'Afternoon 14:00',
    evening: 'Evening 18:00',
    night: 'Night 21:00',
    withFood: 'Food timing',
    beforeFood: 'Before food',
    afterFood: 'After food',
    withMeal: 'With food',
    anyTime: 'Any time',
    addMedicine: '+ Add Another Medicine',
    welcomeTitle: 'Welcome to CareCircle!',
    welcomeSub: 'Your care circle is now set up and watching over you.',
    goToHome: 'Go to My Dashboard',
    emailAlreadyRegistered: 'This email is already registered. Please sign in.',
    faceAlreadyRegistered: 'This face is already registered. Please sign in with Face ID.',
    requiredField: 'This field is required',
    loading: 'Loading, please wait...',
    home: 'Home',
    lifestyle: 'Lifestyle',
    appointments: 'Appointments',
    people: 'Care Circle',
    notifications: 'Notifications',
    exercise: 'Exercise',
    walking: 'Daily Walk',
    food: 'Nutrition & Diet',
    travel: 'Safe Travel',
    stepGoal: 'Daily Step Goal',
    distance: 'Distance',
    walkedToday: 'Walked Today',
    logWalk: 'Log Walk',
    restMode: 'Today is a rest day. Rest comfortably.',
    lightMode: 'Today is a light activity day. Take gentle walks.',
    normalMode: 'Today is a normal active day. Keep moving and stay hydrated!',
    eat: 'Recommended to Eat',
    avoid: 'Recommended to Avoid',
    bookAppointment: 'Book Appointment',
    upcoming: 'Upcoming',
    cancel: 'Cancel',
    familyAccess: 'Family & Caregiver Access',
    grantAccess: 'Grant Access',
    revoke: 'Revoke',
    offline: 'You are currently offline. Emergency contacts remain accessible.',
    online: 'Back online. CareCircle synchronized.',
    installApp: 'Install CareCircle App',
    cameraBlocked: 'Camera access blocked. Tap the 🔒 icon in the address bar to allow.',
    micBlocked: 'Microphone access blocked. Tap the 🔒 icon in the address bar to allow.',
  },
  ta: {
    tagline: 'ஒருபோதும் தனியாக இல்லை. எப்போதும் அன்பான கவனிப்பில்.',
    signIn: 'உள்நுழையவும்',
    register: 'புதியவரா? பதிவு செய்யவும்',
    signOut: 'வெளியேறு',
    disclaimer: 'CareCircle நோய் கண்டறிவதில்லை. இது மருத்துவ ஆலோசனை அல்ல.',
    sos: 'அவசர உதவி (SOS)',
    callingSos: 'அவசர எச்சரிக்கை அனுப்பப்படுகிறது...',
    whoAreYou: 'நீங்கள் யார்?',
    patient: 'முதியவர் / நோயாளி',
    patientDesc: 'நான் வீட்டில் தனியாக அல்லது குடும்பத்துடன் வசிக்கிறேன்',
    doctor: 'மருத்துவர்',
    doctorDesc: 'என் நோயாளிகளை நான் கண்காணிக்கிறேன்',
    relative: 'குடும்ப உறுப்பினர்',
    relativeDesc: 'என் பெற்றோர் அல்லது உறவினர்களை நான் கவனிக்கிறேன்',
    faceId: 'முக அடையாளம் (Face ID)',
    emailPass: 'மின்னஞ்சல் & கடவுச்சொல்',
    lookAtCamera: 'கேமராவை நேரடியாகப் பாருங்கள்',
    faceFound: 'முகம் கண்டறியப்பட்டது!',
    faceNotFound: 'உங்கள் முகத்தைத் தேடுகிறது...',
    captureFace: 'முகத்தை ஸ்கேன் செய்',
    orUseEmail: 'முகத்தை அடையாளம் காண முடியவில்லை — மின்னஞ்சல் மற்றும் கடவுச்சொல்லைப் பயன்படுத்தவும்',
    email: 'மின்னஞ்சல் முகவரி',
    password: 'கடவுச்சொல்',
    name: 'முழுப் பெயர்',
    age: 'வயது',
    phone: 'மொபைல் எண் (10 இலக்கங்கள்)',
    prefLang: 'விருப்ப மொழி',
    next: 'அடுத்த படி',
    back: 'முந்தையது',
    skip: 'இதை தவிர்க்கவும்',
    finish: 'பதிவை முடிக்கவும்',
    step: 'படி',
    of: 'இல்',
    emergencyContacts: 'அவசர தொடர்புகள்',
    whoToCall: 'அவசர காலத்தில் யாரை அழைக்க வேண்டும்?',
    addContact: '+ மற்றொரு தொடர்பைச் சேர்க்கவும்',
    contactName: 'தொடர்பு பெயர்',
    contactPhone: 'மொபைல் எண்',
    relation: 'உறவுமுறை',
    allowAppAccess: 'எனது உடல்நிலைத் தகவலைப் பார்க்க அனுமதிக்கவும்',
    healthConditions: 'உங்கள் உடல்நல விவரங்கள்',
    allergies: 'ஒவ்வாமை (மருந்து/உணவு)',
    homeAddress: 'வீட்டு முகவரி',
    city: 'நகரம்',
    state: 'மாநிலம்',
    pincode: 'அஞ்சல் குறியீடு',
    hospitalAndDoctors: 'மருத்துவமனை மற்றும் மருத்துவர்கள்',
    searchHospital: 'மருத்துவமனையைத் தேடுங்கள் அல்லது கீழே உள்ள எழுத்தைத் தட்டவும்',
    selectHospital: 'மருத்துவமனையைத் தேர்ந்தெடுக்கவும்',
    doctorsAtHospital: 'இங்குள்ள மருத்துவர்கள்',
    medicines: 'தினசரி மாத்திரைகள்',
    searchMedicine: 'மருந்தின் பெயரைத் தேடவும்...',
    dosage: 'அளவு (எ.கா: 1 மாத்திரை)',
    whenToTake: 'எப்போது சாப்பிட வேண்டும்',
    morning: 'காலை 08:00',
    afternoon: 'மதியம் 14:00',
    evening: 'மாலை 18:00',
    night: 'இரவு 21:00',
    withFood: 'உணவு நேரம்',
    beforeFood: 'உணவுக்கு முன்',
    afterFood: 'உணவுக்குப் பின்',
    withMeal: 'உணவோடு',
    anyTime: 'எந்நேரமும்',
    addMedicine: '+ மற்றொரு மருந்தைச் சேர்க்கவும்',
    welcomeTitle: 'CareCircle-க்கு நல்வரவு!',
    welcomeSub: 'உங்கள் பாதுகாப்பு வட்டம் தயார். உங்கள் உடல்நலம் பாதுகாக்கப்படுகிறது.',
    goToHome: 'எனது பக்கத்திற்குச் செல்லவும்',
    emailAlreadyRegistered: 'இந்த மின்னஞ்சல் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. தயவுசெய்து உள்நுழையவும்.',
    faceAlreadyRegistered: 'இந்த முகம் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. Face ID மூலம் உள்நுழையவும்.',
    requiredField: 'இது அவசியமான புலம்',
    loading: 'ஏற்றுகிறது, காத்திருக்கவும்...',
    home: 'முகப்பு',
    lifestyle: 'வாழ்க்கை முறை',
    appointments: 'மருத்துவ சந்திப்புகள்',
    people: 'பாதுகாப்பு வட்டம்',
    notifications: 'அறிவிப்புகள்',
    exercise: 'உடற்பயிற்சி',
    walking: 'நடைப்பயிற்சி',
    food: 'உணவு முறை',
    travel: 'பயண வழிகாட்டுதல்',
    stepGoal: 'தினசரி நடை இலக்கு',
    distance: 'தூரம்',
    walkedToday: 'இன்று நடந்த தூரம்',
    logWalk: 'நடந்ததை பதிவு செய்',
    restMode: 'இன்று ஓய்வு எடுக்கும் நாள். சௌகரியமாக ஓய்வெடுக்கவும்.',
    lightMode: 'இன்று எளிய உடற்பயிற்சி நாள். மெதுவாக நடக்கவும்.',
    normalMode: 'இன்று வழக்கமான சுறுசுறுப்பான நாள். நீரேற்றத்துடன் சுறுசுறுப்பாக இருங்கள்!',
    eat: 'சாப்பிட வேண்டிய உணவுகள்',
    avoid: 'தவிர்க்க வேண்டிய உணவுகள்',
    bookAppointment: 'சந்திப்பை முன்பதிவு செய்',
    upcoming: 'வரவிருப்பவை',
    cancel: 'ரத்து செய்',
    familyAccess: 'குடும்ப அணுகல் அனுமதிகள்',
    grantAccess: 'அனுமதி வழங்கு',
    revoke: 'அனுமதியை ரத்து செய்',
    offline: 'இணைய இணைப்பு இல்லை. அவசர தொடர்புகள் கிடைக்கும்.',
    online: 'இணைய இணைப்பு மீண்டும் கிடைத்துவிட்டது.',
    installApp: 'செயலியை போனில் நிறுவவும்',
    cameraBlocked: 'கேமரா அனுமதி தடுக்கப்பட்டது. முகவரி பட்டியில் 🔒 குறியை தட்டி அனுமதிக்கவும்.',
    micBlocked: 'மைக்ரோஃபோன் அனுமதி தடுக்கப்பட்டது. முகவரி பட்டியில் 🔒 குறியை தட்டவும்.',
  },
  hi: {
    tagline: 'कभी अकेले नहीं। हमेशा देखभाल में।',
    signIn: 'साइन इन करें',
    register: 'नए हैं? पंजीकरण करें',
    signOut: 'साइन आउट',
    disclaimer: 'CareCircle निदान नहीं करता है। यह चिकित्सीय सलाह नहीं है।',
    sos: 'आपातकालीन सहायता (SOS)',
    callingSos: 'आपातकालीन चेतावनी भेजी जा रही है...',
    whoAreYou: 'आप कौन हैं?',
    patient: 'बुजुर्ग / मरीज़',
    patientDesc: 'मैं घर पर रहता/रहती हूँ',
    doctor: 'डॉक्टर',
    doctorDesc: 'मैं अपने मरीज़ों की देखभाल करता हूँ',
    relative: 'परिवार का सदस्य',
    relativeDesc: 'मैं अपने माता-पिता या रिश्तेदारों की देखरेख करता हूँ',
    faceId: 'फेस आईडी (Face ID)',
    emailPass: 'ईमेल और पासवर्ड',
    lookAtCamera: 'सीधे कैमरे की ओर देखें',
    faceFound: 'चेहरा मिल गया!',
    faceNotFound: 'चेहरे की पहचान हो रही है...',
    captureFace: 'चेहरा स्कैन करें',
    orUseEmail: 'हम आपको पहचान नहीं पाए — कृपया ईमेल और पासवर्ड का उपयोग करें',
    email: 'ईमेल पता',
    password: 'पासवर्ड',
    name: 'पूरा नाम',
    age: 'उम्र',
    phone: 'मोबाइल नंबर (10 अंक)',
    prefLang: 'पसंदीदा भाषा',
    next: 'आगे बढ़ें',
    back: 'पीछे',
    skip: 'इसे छोड़ें',
    finish: 'पंजीकरण पूरा करें',
    step: 'चरण',
    of: 'का',
    emergencyContacts: 'आपातकालीन संपर्क',
    whoToCall: 'आपात स्थिति में किसे कॉल करें?',
    addContact: '+ एक और संपर्क जोड़ें',
    contactName: 'संपर्क का नाम',
    contactPhone: 'मोबाइल नंबर',
    relation: 'रिश्ता',
    allowAppAccess: 'इन्हें मेरा स्वास्थ्य डैशबोर्ड देखने की अनुमति दें',
    healthConditions: 'आपकी स्वास्थ्य स्थिति',
    allergies: 'एलर्जी (दवा/भोजन)',
    homeAddress: 'घर का पता',
    city: 'शहर',
    state: 'राज्य',
    pincode: 'पिन कोड',
    hospitalAndDoctors: 'आपका अस्पताल और डॉक्टर',
    searchHospital: 'अस्पताल खोजें या नीचे दिए अक्षर पर टैप करें',
    selectHospital: 'अस्पताल चुनें',
    doctorsAtHospital: 'इस अस्पताल के डॉक्टर',
    medicines: 'आपकी दैनिक दवाएं',
    searchMedicine: 'दवा का नाम खोजें...',
    dosage: 'खुराक (उदा. 1 गोली)',
    whenToTake: 'कब लेना है',
    morning: 'सुबह 08:00',
    afternoon: 'दोपहर 14:00',
    evening: 'शाम 18:00',
    night: 'रात 21:00',
    withFood: 'भोजन का समय',
    beforeFood: 'भोजन से पहले',
    afterFood: 'भोजन के बाद',
    withMeal: 'भोजन के साथ',
    anyTime: 'किसी भी समय',
    addMedicine: '+ एक और दवा जोड़ें',
    welcomeTitle: 'CareCircle में आपका स्वागत है!',
    welcomeSub: 'आपका सुरक्षा घेरा तैयार है। आपकी निरंतर देखभाल की जा रही है।',
    goToHome: 'मेरे डैशबोर्ड पर जाएं',
    emailAlreadyRegistered: 'यह ईमेल पहले से पंजीकृत है। कृपया साइन इन करें।',
    faceAlreadyRegistered: 'यह चेहरा पहले से पंजीकृत है। कृपया Face ID से साइन इन करें।',
    requiredField: 'यह फ़ील्ड आवश्यक है',
    loading: 'लोड हो रहा है, कृपया प्रतीक्षा करें...',
    home: 'होम',
    lifestyle: 'दिनचर्या',
    appointments: 'अपॉइंटमेंट्स',
    people: 'देखभाल दायरा',
    notifications: 'सूचनाएं',
    exercise: 'व्यायाम',
    walking: 'दैनिक टहलना',
    food: 'आहार और पोषण',
    travel: 'सुरक्षित यात्रा',
    stepGoal: 'दैनिक कदम लक्ष्य',
    distance: 'दूरी',
    walkedToday: 'आज टहला गया',
    logWalk: 'टहलना दर्ज करें',
    restMode: 'आज आराम करने का दिन है। आराम से बैठें।',
    lightMode: 'आज हल्की गतिविधि का दिन है। धीमी गति से टहलें।',
    normalMode: 'आज सामान्य सक्रिय दिन है। चलते रहें और पर्याप्त पानी पिएं!',
    eat: 'खाने योग्य स्वस्थ आहार',
    avoid: 'परहेज़ करने योग्य चीजें',
    bookAppointment: 'अपॉइंटमेंट बुक करें',
    upcoming: 'आगामी',
    cancel: 'रद्द करें',
    familyAccess: 'परिवार और देखभालकर्ता पहुंच',
    grantAccess: 'पहुंच अनुमति दें',
    revoke: 'पहुंच हटाएं',
    offline: 'आप वर्तमान में ऑफ़लाइन हैं। आपातकालीन संपर्क उपलब्ध हैं।',
    online: 'पुनः ऑनलाइन। CareCircle सिंक हो गया।',
    installApp: 'CareCircle ऐप इंस्टॉल करें',
    cameraBlocked: 'कैमरा पहुंच अवरुद्ध। एड्रेस बार में 🔒 आइकन पर टैप करें।',
    micBlocked: 'माइक पहुंच अवरुद्ध। एड्रेस बार में 🔒 आइकन पर टैप करें।',
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  speechLocale: string;
  t: (key: string) => string;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('carecircle_lang') as LanguageCode;
    return saved && ['en', 'ta', 'hi'].includes(saved) ? saved : 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('carecircle_lang', lang);
  };

  const currentOption = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const speechLocale = currentOption.speechLocale;

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLocale;
      utterance.rate = 0.9; // Slightly slower, clearer for elders

      // Try finding preferred voice
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find((v) => v.lang.startsWith(language) || v.lang.includes(speechLocale));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        speechLocale,
        t,
        speak,
        stopSpeaking,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
