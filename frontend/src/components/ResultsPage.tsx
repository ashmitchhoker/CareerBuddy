import React from "react";
import { ArrowLeft, MessageCircle, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { LanguageSelector } from "./LanguageSelector";
import type { Page, UserProfile, Language, AssessmentResults } from "../App";

interface ResultsPageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  navigateTo: (page: Page, displayResults?: boolean, assessmentId?: number) => void;
  assessmentResults: AssessmentResults;
  assessmentId: number | null;
}

const riasecDescriptions: Record<string, Record<Language, { name: string; description: string }>> = {
  R: {
    en: { name: "Realistic", description: "You enjoy working with tools, machines, and hands-on activities. You like building, fixing, and creating things with your hands." },
    hi: { name: "यथार्थवादी", description: "आप उपकरण, मशीनों और व्यावहारिक गतिविधियों के साथ काम करना पसंद करते हैं। आप अपने हाथों से चीजें बनाना, ठीक करना और बनाना पसंद करते हैं।" },
    te: { name: "వాస్తవిక", description: "మీరు సాధనాలు, యంత్రాలు మరియు చేతితో చేసే కార్యకలాపాలతో పని చేయడాన్ని ఆనందిస్తారు। మీరు మీ చేతులతో వస్తువులను నిర్మించడం, సరిచేయడం మరియు సృష్టించడం ఇష్టపడతారు." },
    ta: { name: "யதார்த்தமான", description: "நீங்கள் கருவிகள், இயந்திரங்கள் மற்றும் கைவினைப் பணிகளுடன் பணிபுரிவதை விரும்புகிறீர்கள். உங்கள் கைகளால் விஷயங்களை கட்டுவது, சரிசெய்வது மற்றும் உருவாக்குவது உங்களுக்கு பிடிக்கும்." },
    bn: { name: "বাস্তববাদী", description: "আপনি সরঞ্জাম, মেশিন এবং হাতে-কলমে কাজ করতে উপভোগ করেন। আপনি আপনার হাত দিয়ে জিনিস তৈরি, মেরামত এবং তৈরি করতে পছন্দ করেন।" },
    gu: { name: "વાસ્તવિક", description: "તમે સાધનો, મશીનો અને હાથથી કરવાની પ્રવૃત્તિઓ સાથે કામ કરવાનું ગમે છે. તમે તમારા હાથોથી વસ્તુઓ બનાવવા, સુધારવા અને બનાવવા ગમે છે." },
  },
  I: {
    en: { name: "Investigative", description: "You love exploring ideas, solving problems, and understanding how things work. You enjoy science, research, and discovering new knowledge." },
    hi: { name: "जांचकर्ता", description: "आप विचारों की खोज करना, समस्याओं को हल करना और चीजों के काम करने के तरीके को समझना पसंद करते हैं। आप विज्ञान, अनुसंधान और नए ज्ञान की खोज का आनंद लेते हैं।" },
    te: { name: "విచారణాత్మక", description: "మీరు ఆలోచనలను అన్వేషించడం, సమస్యలను పరిష్కరించడం మరియు విషయాలు ఎలా పని చేస్తాయో అర్థం చేసుకోవడం ప్రేమిస్తారు। మీరు సైన్స్, పరిశోధన మరియు కొత్త జ్ఞానాన్ని కనుగొనడాన్ని ఆనందిస్తారు." },
    ta: { name: "விசாரணை", description: "நீங்கள் கருத்துகளை ஆராய்வது, சிக்கல்களைத் தீர்ப்பது மற்றும் விஷயங்கள் எவ்வாறு செயல்படுகின்றன என்பதைப் புரிந்துகொள்வதை விரும்புகிறீர்கள்। நீங்கள் அறிவியல், ஆராய்ச்சி மற்றும் புதிய அறிவைக் கண்டறிவதை அனுபவிக்கிறீர்கள்." },
    bn: { name: "তদন্তকারী", description: "আপনি ধারণা অন্বেষণ, সমস্যা সমাধান এবং জিনিসগুলি কীভাবে কাজ করে তা বোঝা পছন্দ করেন। আপনি বিজ্ঞান, গবেষণা এবং নতুন জ্ঞান আবিষ্কার করতে উপভোগ করেন।" },
    gu: { name: "તપાસકાર", description: "તમે વિચારોની શોધ કરવી, સમસ્યાઓ હલ કરવી અને વસ્તુઓ કેવી રીતે કામ કરે છે તે સમજવું ગમે છે. તમે વિજ્ઞાન, સંશોધન અને નવું જ્ઞાન શોધવાનું ગમે છે." },
  },
  A: {
    en: { name: "Artistic", description: "You are creative and expressive. You enjoy art, music, writing, and using your imagination to create something new and beautiful." },
    hi: { name: "कलात्मक", description: "आप रचनात्मक और अभिव्यंजक हैं। आप कला, संगीत, लेखन का आनंद लेते हैं और कुछ नया और सुंदर बनाने के लिए अपनी कल्पना का उपयोग करते हैं।" },
    te: { name: "కళాత్మక", description: "మీరు సృజనాత్మక మరియు వ్యక్తీకరణ. మీరు కళ, సంగీతం, రచనను ఆనందిస్తారు మరియు కొత్త మరియు అందమైనదాన్ని సృష్టించడానికి మీ ఊహను ఉపయోగిస్తారు." },
    ta: { name: "கலை", description: "நீங்கள் ஆக்கபூர்வமானவர் மற்றும் வெளிப்படுத்துபவர். நீங்கள் கலை, இசை, எழுத்து ஆகியவற்றை அனுபவிக்கிறீர்கள் மற்றும் புதிய மற்றும் அழகான ஒன்றை உருவாக்க உங்கள் கற்பனையைப் பயன்படுத்துகிறீர்கள்." },
    bn: { name: "শৈল্পিক", description: "আপনি সৃজনশীল এবং অভিব্যক্তিপূর্ণ। আপনি শিল্প, সঙ্গীত, লেখা উপভোগ করেন এবং নতুন এবং সুন্দর কিছু তৈরি করতে আপনার কল্পনা ব্যবহার করেন।" },
    gu: { name: "કલાત્મક", description: "તમે સર્જનાત્મક અને અભિવ્યક્તિશીલ છો. તમે કલા, સંગીત, લેખનનો આનંદ લો છો અને કંઈક નવું અને સુંદર બનાવવા માટે તમારી કલ્પનાનો ઉપયોગ કરો છો." },
  },
  S: {
    en: { name: "Social", description: "You enjoy helping others, teaching, and working with people. You care about making a difference in people's lives and building relationships." },
    hi: { name: "सामाजिक", description: "आप दूसरों की मदद करना, पढ़ाना और लोगों के साथ काम करना पसंद करते हैं। आप लोगों के जीवन में बदलाव लाने और रिश्ते बनाने की परवाह करते हैं।" },
    te: { name: "సామాజిక", description: "మీరు ఇతరులకు సహాయం చేయడం, బోధించడం మరియు ప్రజలతో పని చేయడాన్ని ఆనందిస్తారు. మీరు ప్రజల జీవితాలలో మార్పు తీసుకురావడం మరియు సంబంధాలను నిర్మించడం గురించి శ్రద్ధ వహిస్తారు." },
    ta: { name: "சமூக", description: "நீங்கள் மற்றவர்களுக்கு உதவுவது, கற்பித்தல் மற்றும் மக்களுடன் பணிபுரிவதை விரும்புகிறீர்கள்। மக்களின் வாழ்க்கையில் மாற்றத்தை ஏற்படுத்துவதிலும் உறவுகளை உருவாக்குவதிலும் நீங்கள் அக்கறை கொண்டுள்ளீர்கள்." },
    bn: { name: "সামাজিক", description: "আপনি অন্যদের সাহায্য করা, শিক্ষাদান এবং মানুষের সাথে কাজ করতে উপভোগ করেন। আপনি মানুষের জীবনে পরিবর্তন আনা এবং সম্পর্ক গড়ে তোলার বিষয়ে যত্নশীল।" },
    gu: { name: "સામાજિક", description: "તમે અન્ય લોકોને મદદ કરવી, શીખવવી અને લોકો સાથે કામ કરવાનું ગમે છે. તમે લોકોના જીવનમાં ફેરફાર લાવવા અને સંબંધો બનાવવા વિશે કાળજી રાખો છો." },
  },
  E: {
    en: { name: "Enterprising", description: "You are a leader and enjoy taking charge. You like organizing, persuading, and working toward goals. Business and management appeal to you." },
    hi: { name: "उद्यमी", description: "आप एक नेता हैं और जिम्मेदारी लेना पसंद करते हैं। आप संगठन, मनाने और लक्ष्यों की ओर काम करना पसंद करते हैं। व्यवसाय और प्रबंधन आपको आकर्षित करते हैं।" },
    te: { name: "వ్యాపార", description: "మీరు నాయకుడు మరియు బాధ్యత తీసుకోవడాన్ని ఆనందిస్తారు. మీరు నిర్వహించడం, ఒప్పించడం మరియు లక్ష్యాల వైపు పని చేయడం ఇష్టపడతారు. వ్యాపారం మరియు నిర్వహణ మీకు ఆకర్షణీయంగా ఉంటాయి." },
    ta: { name: "தொழில்முனைவோர்", description: "நீங்கள் ஒரு தலைவர் மற்றும் பொறுப்பை ஏற்றுக்கொள்வதை விரும்புகிறீர்கள்। நீங்கள் ஒழுங்கமைத்தல், வற்புறுத்துதல் மற்றும் இலக்குகளை நோக்கி பணிபுரிவதை விரும்புகிறீர்கள்। வணிகம் மற்றும் மேலாண்மை உங்களை ஈர்க்கிறது." },
    bn: { name: "উদ্যোগী", description: "আপনি একজন নেতা এবং দায়িত্ব নিতে উপভোগ করেন। আপনি সংগঠিত করা, রাজি করানো এবং লক্ষ্যের দিকে কাজ করতে পছন্দ করেন। ব্যবসা এবং ব্যবস্থাপনা আপনাকে আকর্ষণ করে।" },
    gu: { name: "ઉદ્યોગી", description: "તમે એક નેતા છો અને જવાબદારી લેવાનું ગમે છે. તમે સંગઠન, મનાવવું અને લક્ષ્યો તરફ કામ કરવાનું ગમે છે. વ્યવસાય અને વ્યવસ્થાપન તમને આકર્ષે છે." },
  },
  C: {
    en: { name: "Conventional", description: "You prefer organized, structured work. You enjoy following procedures, working with data, and keeping things neat and orderly." },
    hi: { name: "पारंपरिक", description: "आप व्यवस्थित, संरचित कार्य पसंद करते हैं। आप प्रक्रियाओं का पालन करना, डेटा के साथ काम करना और चीजों को साफ और व्यवस्थित रखना पसंद करते हैं।" },
    te: { name: "సంప్రదాయ", description: "మీరు వ్యవస్థీకృత, నిర్మాణాత్మక పనిని ఇష్టపడతారు. మీరు విధానాలను అనుసరించడం, డేటాతో పని చేయడం మరియు విషయాలను చక్కగా మరియు క్రమబద్ధంగా ఉంచడాన్ని ఆనందిస్తారు." },
    ta: { name: "பாரம்பரிய", description: "நீங்கள் ஒழுங்கமைக்கப்பட்ட, கட்டமைக்கப்பட்ட வேலையை விரும்புகிறீர்கள்। நீங்கள் நடைமுறைகளைப் பின்பற்றுவது, தரவுகளுடன் பணிபுரிவது மற்றும் விஷயங்களை சுத்தமாகவும் ஒழுங்காகவும் வைத்திருப்பதை விரும்புகிறீர்கள்." },
    bn: { name: "প্রচলিত", description: "আপনি সংগঠিত, কাঠামোগত কাজ পছন্দ করেন। আপনি পদ্ধতি অনুসরণ করা, ডেটা নিয়ে কাজ করা এবং জিনিসগুলি পরিষ্কার এবং সুশৃঙ্খল রাখতে উপভোগ করেন।" },
    gu: { name: "પરંપરાગત", description: "તમે વ્યવસ્થિત, માળખાકીય કામ પસંદ કરો છો. તમે પ્રક્રિયાઓને અનુસરવી, ડેટા સાથે કામ કરવું અને વસ્તુઓને સ્વચ્છ અને વ્યવસ્થિત રાખવાનું ગમે છે." },
  },
};

export function ResultsPage({
  userProfile,
  setUserProfile,
  navigateTo,
  assessmentResults,
  assessmentId,
}: ResultsPageProps) {
  const lang = userProfile.language;
  const riasecScores = assessmentResults.riasecScores;

  const translations = {
    en: {
      title: "Your Assessment Results",
      subtitle: "Discover your personality type and career matches",
      riasecTitle: "Your Personality Profile",
      riasecDescription: "Based on your answers, here's your personality profile. This helps us understand what types of activities and work environments you enjoy most.",
      top3Title: "Your Top 3 Strengths",
      top3Description: "These are your strongest personality types. Careers that match these types will likely be the best fit for you.",
      viewRecommendations: "View Career Recommendations",
      talkToGuide: "Talk with Career Guide",
      backToHome: "Back to Home",
    },
    hi: {
      title: "आपके मूल्यांकन परिणाम",
      subtitle: "अपने व्यक्तित्व प्रकार और करियर मैच खोजें",
      riasecTitle: "आपका व्यक्तित्व प्रोफ़ाइल",
      riasecDescription: "आपके उत्तरों के आधार पर, यहाँ आपका व्यक्तित्व प्रोफ़ाइल है। यह हमें समझने में मदद करता है कि आप किस प्रकार की गतिविधियों और कार्य वातावरण का सबसे अधिक आनंद लेते हैं।",
      top3Title: "आपकी शीर्ष 3 ताकतें",
      top3Description: "ये आपके सबसे मजबूत व्यक्तित्व प्रकार हैं। इन प्रकारों से मेल खाने वाले करियर आपके लिए सबसे उपयुक्त होंगे।",
      viewRecommendations: "करियर सुझाव देखें",
      talkToGuide: "करियर गाइड से बात करें",
      backToHome: "होम पर वापस जाएं",
    },
    te: {
      title: "మీ అసెస్‌మెంట్ ఫలితాలు",
      subtitle: "మీ వ్యక్తిత్వ రకం మరియు కెరీర్ మ్యాచ్‌లను కనుగొనండి",
      riasecTitle: "మీ వ్యక్తిత్వ ప్రొఫైల్",
      riasecDescription: "మీ సమాధానాల ఆధారంగా, ఇక్కడ మీ వ్యక్తిత్వ ప్రొఫైల్ ఉంది. ఇది మీరు ఎలాంటి కార్యకలాపాలు మరియు పని వాతావరణాలను ఎక్కువగా ఆనందిస్తారో అర్థం చేసుకోవడంలో మాకు సహాయపడుతుంది.",
      top3Title: "మీ టాప్ 3 బలాలు",
      top3Description: "ఇవి మీ బలమైన వ్యక్తిత్వ రకాలు. ఈ రకాలకు సరిపోయే కెరీర్‌లు మీకు ఉత్తమమైనవి.",
      viewRecommendations: "కెరీర్ సిఫార్సులను వీక్షించండి",
      talkToGuide: "కెరీర్ గైడ్‌తో మాట్లాడండి",
      backToHome: "హోమ్‌కు తిరిగి వెళ్లండి",
    },
    ta: {
      title: "உங்கள் மதிப்பீட்டு முடிவுகள்",
      subtitle: "உங்கள் ஆளுமை வகை மற்றும் தொழில் பொருத்தங்களைக் கண்டறியவும்",
      riasecTitle: "உங்கள் ஆளுமை சுயவிவரம்",
      riasecDescription: "உங்கள் பதில்களின் அடிப்படையில், இங்கே உங்கள் ஆளுமை சுயவிவரம் உள்ளது. நீங்கள் எந்த வகையான செயல்பாடுகள் மற்றும் பணி சூழல்களை மிகவும் விரும்புகிறீர்கள் என்பதைப் புரிந்துகொள்ள இது எங்களுக்கு உதவுகிறது.",
      top3Title: "உங்கள் முதல் 3 பலங்கள்",
      top3Description: "இவை உங்கள் வலுவான ஆளுமை வகைகள். இந்த வகைகளுடன் பொருந்தும் தொழில்கள் உங்களுக்கு சிறந்ததாக இருக்கும்.",
      viewRecommendations: "தொழில் பரிந்துரைகளைப் பார்க்கவும்",
      talkToGuide: "தொழில் வழிகாட்டியுடன் பேசுங்கள்",
      backToHome: "வீட்டிற்குத் திரும்பவும்",
    },
    bn: {
      title: "আপনার মূল্যায়নের ফলাফল",
      subtitle: "আপনার ব্যক্তিত্বের ধরন এবং ক্যারিয়ার ম্যাচ আবিষ্কার করুন",
      riasecTitle: "আপনার ব্যক্তিত্ব প্রোফাইল",
      riasecDescription: "আপনার উত্তরগুলির ভিত্তিতে, এখানে আপনার ব্যক্তিত্ব প্রোফাইল রয়েছে। এটি আমাদের বুঝতে সাহায্য করে যে আপনি কোন ধরণের ক্রিয়াকলাপ এবং কাজের পরিবেশ সবচেয়ে বেশি উপভোগ করেন।",
      top3Title: "আপনার শীর্ষ 3 শক্তি",
      top3Description: "এগুলি আপনার সবচেয়ে শক্তিশালী ব্যক্তিত্বের ধরন। এই ধরনের সাথে মিলে যাওয়া ক্যারিয়ারগুলি আপনার জন্য সবচেয়ে উপযুক্ত হবে।",
      viewRecommendations: "ক্যারিয়ার সুপারিশ দেখুন",
      talkToGuide: "ক্যারিয়ার গাইডের সাথে কথা বলুন",
      backToHome: "হোমে ফিরে যান",
    },
    gu: {
      title: "તમારા મૂલ્યાંકનના પરિણામો",
      subtitle: "તમારા વ્યક્તિત્વ પ્રકાર અને કારકિર્દી મેચ શોધો",
      riasecTitle: "તમારું વ્યક્તિત્વ પ્રોફાઇલ",
      riasecDescription: "તમારા જવાબોના આધારે, અહીં તમારું વ્યક્તિત્વ પ્રોફાઇલ છે. આ અમને સમજવામાં મદદ કરે છે કે તમે કયા પ્રકારની પ્રવૃત્તિઓ અને કાર્ય વાતાવરણનો સૌથી વધુ આનંદ લો છો.",
      top3Title: "તમારી ટોપ 3 શક્તિઓ",
      top3Description: "આ તમારા સૌથી મજબૂત વ્યક્તિત્વ પ્રકારો છે. આ પ્રકારો સાથે મેળ ખાતા કારકિર્દી તમારા માટે શ્રેષ્ઠ હશે.",
      viewRecommendations: "કારકિર્દી ભલામણો જુઓ",
      talkToGuide: "કારકિર્દી માર્ગદર્શિકા સાથે વાત કરો",
      backToHome: "હોમ પર પાછા જાઓ",
    },
  };

  const t = translations[lang];

  if (!riasecScores) {
    // Fallback if no RIASEC scores available
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold mb-4">{t.title}</h1>
              <p className="text-gray-600 mb-6">{assessmentResults.summary}</p>
              <Button
                onClick={() => navigateTo("chatbot", true, assessmentId || undefined)}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {t.viewRecommendations}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const top3Codes = riasecScores.top3.split("");
  const top3Data = top3Codes.map((code) => ({
    code,
    score: riasecScores.scores[code],
    ...riasecDescriptions[code][lang],
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateTo("home")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-sm text-gray-600">{t.subtitle}</p>
            </div>
            <LanguageSelector
              language={userProfile.language}
              onLanguageChange={(lang) => setUserProfile({ ...userProfile, language: lang })}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* RIASEC Profile Section */}
        <Card className="mb-6 border-2 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t.riasecTitle}</h2>
                <p className="text-gray-600 text-sm mt-1">{t.riasecDescription}</p>
              </div>
            </div>

            {/* All 6 RIASEC Types with Progress Bars */}
            <div className="space-y-4 mb-8">
              {riasecScores.ordered.map((item, index) => {
                const isTop3 = top3Codes.includes(item.code);
                const desc = riasecDescriptions[item.code][lang];
                return (
                  <div
                    key={item.code}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isTop3
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-md"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            isTop3
                              ? "bg-gradient-to-br from-blue-500 to-purple-500"
                              : "bg-gray-400"
                          }`}
                        >
                          {item.code}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {desc.name}
                            {isTop3 && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Top 3
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-600">{desc.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {item.score.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <Progress value={item.score} className="h-3" />
                  </div>
                );
              })}
            </div>

            {/* Top 3 Highlight Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">{t.top3Title}</h3>
              </div>
              <p className="text-gray-700 mb-4">{t.top3Description}</p>
              
              <div className="grid md:grid-cols-3 gap-4">
                {top3Data.map((item, index) => (
                  <div
                    key={item.code}
                    className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {item.code}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-600">{item.score.toFixed(0)}% Match</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => navigateTo("chatbot", true, assessmentId || undefined)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-lg"
            size="lg"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            {t.viewRecommendations}
          </Button>
          <Button
            onClick={() => navigateTo("home")}
            variant="outline"
            className="flex-1 h-12 text-lg"
            size="lg"
          >
            {t.backToHome}
          </Button>
        </div>
      </main>
    </div>
  );
}

