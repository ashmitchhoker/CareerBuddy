import { GraduationCap, MessageCircle, ClipboardList, User, Settings, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Card, CardContent } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { LanguageSelector } from './LanguageSelector';
import type { Page, UserProfile, Language, SavedAssessment, CompletedAssessment } from '../App';

interface HomePageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  navigateTo: (page: Page) => void;
  savedAssessment: SavedAssessment | null;
  completedAssessments: CompletedAssessment[];
  startAssessmentFlow: () => void;
  onLogout: () => void;
  isGuestMode?: boolean;
}

const languages = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  bn: 'বাংলা',
  gu: 'ગુજરાતી'
};

const translations = {
  en: {
    title: 'PathFinder',
    subtitle: 'Your Career Guidance Companion',
    welcome: 'Welcome back',
    progress: 'Your Progress',
    complete: 'Complete',
    quickActions: 'Quick Actions',
    chatbot: 'Talk to Career Guide',
    chatbotDesc: 'Get instant answers to your career questions',
    takeTest: 'Take Assessment',
    takeTestDesc: 'Discover your strengths and interests',
    viewResults: 'Previous Assessments',
    viewResultsDesc: 'View your completed assessments',
    language: 'Language',
    settings: 'Settings',
    logout: 'Logout',
    noAssessments: 'No assessments completed yet',
    pendingAssessment: 'Pending Assessment',
    assessment: 'Assessment',
    continue: 'Continue'
  },
  hi: {
    title: 'पाथफाइंडर',
    subtitle: 'आपका करियर मार्गदर्शन साथी',
    welcome: 'वापसी पर स्वागत है',
    progress: 'आपकी प्रगति',
    complete: 'पूर्ण',
    quickActions: 'त्वरित कार्य',
    chatbot: 'करियर गाइड से बात करें',
    chatbotDesc: 'अपने करियर प्रश्नों के तुरंत उत्तर पाएं',
    takeTest: 'मूल्यांकन लें',
    takeTestDesc: 'अपनी शक्तियों और रुचियों की खोज करें',
    viewResults: 'पिछले मूल्यांकन',
    viewResultsDesc: 'अपने पूर्ण मूल्यांकन देखें',
    language: 'भाषा',
    settings: 'सेटिंग्स',
    logout: 'लॉगआउट',
    noAssessments: 'अभी तक कोई मूल्यांकन पूर्ण नहीं',
    pendingAssessment: 'लंबित मूल्यांकन',
    assessment: 'मूल्यांकन',
    continue: 'जारी रखें'
  },
  te: {
    title: 'పాత్‌ఫైండర్',
    subtitle: 'మీ కెరీర్ మార్గదర్శక సహచరుడు',
    welcome: 'తిరిగి స్వాగతం',
    progress: 'మీ పురోగతి',
    complete: 'పూర్తి',
    quickActions: 'శీఘ్ర చర్యలు',
    chatbot: 'కెరీర్ గైడ్‌తో మాట్లాడండి',
    chatbotDesc: 'మీ కెరీర్ ప్రశ్నలకు తక్షణ సమాధానాలు పొందండి',
    takeTest: 'అసెస్‌మెంట్ తీసుకోండి',
    takeTestDesc: 'మీ బలాలు మరియు ఆసక్తులను కనుగొనండి',
    viewResults: 'మునుపటి అసెస్‌మెంట్లు',
    viewResultsDesc: 'మీ పూర్తి అసెస్‌మెంట్లను చూడండి',
    language: 'భాష',
    settings: 'సెట్టింగ్‌లు',
    logout: 'లాగౌట్',
    noAssessments: 'ఇంకా అసెస్‌మెంట్లు పూర్తి కాలేదు',
    pendingAssessment: 'పెండింగ్ అసెస్‌మెంట్',
    assessment: 'అసెస్‌మెంట్',
    continue: 'కొనసాగించండి'
  },
  ta: {
    title: 'பாத்ஃபைண்டர்',
    subtitle: 'உங்கள் தொழில் வழிகாட்டி துணை',
    welcome: 'மீண்டும் வரவேற்கிறோம்',
    progress: 'உங்கள் முன்னேற்றம்',
    complete: 'முழுமை',
    quickActions: 'விரைவு செயல்கள்',
    chatbot: 'தொழில் வழிகாட்டியுடன் பேசுங்கள்',
    chatbotDesc: 'உங்கள் தொழில் கேள்விகளுக்கு உடனடி பதில்களைப் பெறுங்கள்',
    takeTest: 'மதிப்பீடு எடுங்கள்',
    takeTestDesc: 'உங்கள் பலம் மற்றும் ஆர்வங்களைக் கண்டறியுங்கள்',
    viewResults: 'முந்தைய மதிப்பீடுகள்',
    viewResultsDesc: 'முடிந்த மதிப்பீடுகளைப் பார்க்கவும்',
    language: 'மொழி',
    settings: 'அமைப்புகள்',
    logout: 'வெளியேறு',
    noAssessments: 'இன்னும் மதிப்பீடுகள் முடிக்கப்படவில்லை',
    pendingAssessment: 'நிலுவையில் உள்ள மதிப்பீடு',
    assessment: 'மதிப்பீடு',
    continue: 'தொடரவும்'
  },
  bn: {
    title: 'পাথফাইন্ডার',
    subtitle: 'আপনার ক্যারিয়ার গাইডেন্স সঙ্গী',
    welcome: 'আবার স্বাগতম',
    progress: 'আপনার অগ্রগতি',
    complete: 'সম্পূর্ণ',
    quickActions: 'দ্রুত কর্ম',
    chatbot: 'ক্যারিয়ার গাইডের সাথে কথা বলুন',
    chatbotDesc: 'আপনার ক্যারিয়ার প্রশ্নের তাৎক্ষণিক উত্তর পান',
    takeTest: 'মূল্যায়ন নিন',
    takeTestDesc: 'আপনার শক্তি এবং আগ্রহ আবিষ্কার করুন',
    viewResults: 'পূর্ববর্তী মূল্যায়ন',
    viewResultsDesc: 'সম্পূর্ণ মূল্যায়ন দেখুন',
    language: 'ভাষা',
    settings: 'সেটিংস',
    logout: 'লগআউট',
    noAssessments: 'এখনও কোন মূল্যায়ন সম্পূর্ণ হয়নি',
    pendingAssessment: 'মুলতুবি মূল্যায়ন',
    assessment: 'মূল্যায়ন',
    continue: 'চালিয়ে যান'
  },
  gu: {
    title: 'પાથફાઇન્ડર',
    subtitle: 'તમારા કારકિર્દી માર્ગદર્શક સાથી',
    welcome: 'ફરીથી સ્વાગત છે',
    progress: 'તમારી પ્રગતિ',
    complete: 'પૂર્ણ',
    quickActions: 'ઝડપી ક્રિયાઓ',
    chatbot: 'કારકિર્દી માર્ગદર્શક સાથે વાત કરો',
    chatbotDesc: 'તમારા કારકિર્દી પ્રશ્નોના તાત્કાલિક જવાબો મેળવો',
    takeTest: 'મૂલ્યાંકન લો',
    takeTestDesc: 'તમારી શક્તિઓ અને રુચિઓ શોધો',
    viewResults: 'અગાઉના મૂલ્યાંકનો',
    viewResultsDesc: 'તમારા પૂર્ણ મૂલ્યાંકનો જુઓ',
    language: 'ભાષા',
    settings: 'સેટિંગ્સ',
    logout: 'લૉગઆઉટ',
    noAssessments: 'હજી સુધી કોઈ મૂલ્યાંકન પૂર્ણ થયું નથી',
    pendingAssessment: 'પેન્ડિંગ મૂલ્યાંકન',
    assessment: 'મૂલ્યાંકન',
    continue: 'ચાલુ રાખો'
  }
};

const testTitles: { [key: string]: string } = {
  riasec: 'RIASEC Personality Assessment',
  values: 'Values & Motivation',
  personal: 'Personal Information'
};

export function HomePage({ userProfile, setUserProfile, navigateTo, savedAssessment, completedAssessments, startAssessmentFlow, onLogout, isGuestMode = false }: HomePageProps) {
  const t = translations[userProfile.language];

  const handleLanguageChange = (lang: Language) => {
    setUserProfile({ ...userProfile, language: lang });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-blue-900">CareerBuddy</h1>
                <p className="text-gray-600 text-sm">Your Career Guidance Companion</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <LanguageSelector 
                language={userProfile.language}
                onLanguageChange={handleLanguageChange}
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2">
                    <Avatar className="h-10 w-10 cursor-pointer border-2 border-purple-200 hover:border-purple-400 transition-colors">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigateTo('settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    {t.settings}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={onLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-2">
            {isGuestMode ? `${t.welcome}! 👋` : `${t.welcome}, ${userProfile.name}! 👋`}
          </h2>
        </div>

        {/* Progress Card - Only show if there's a saved assessment */}
        {savedAssessment && (
          <Card className="mb-8 border-2 border-purple-100 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-900">{t.pendingAssessment}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Complete Assessment - Continue where you left off
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-purple-600">{Math.round(savedAssessment.overallProgress ?? savedAssessment.progress)}%</div>
                  <div className="text-gray-500 text-sm">{t.complete}</div>
                </div>
              </div>
              <Progress value={savedAssessment.overallProgress ?? savedAssessment.progress} className="h-3 mb-4" />
              <Button 
                onClick={startAssessmentFlow}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {t.continue}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-gray-900 mb-4">{t.quickActions}</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Chatbot Card */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-300 group"
            onClick={() => navigateTo('chatbot')}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-100 p-4 rounded-2xl mb-4 group-hover:bg-blue-200 transition-colors">
                  <MessageCircle className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-gray-900 mb-2">{t.chatbot}</h3>
                <p className="text-gray-600 text-sm">{t.chatbotDesc}</p>
              </div>
            </CardContent>
          </Card>

          {/* Take Test Card */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-300 group"
            onClick={startAssessmentFlow}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-purple-100 p-4 rounded-2xl mb-4 group-hover:bg-purple-200 transition-colors">
                  <ClipboardList className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-gray-900 mb-2">{t.takeTest}</h3>
                <p className="text-gray-600 text-sm">{t.takeTestDesc}</p>
              </div>
            </CardContent>
          </Card>

          {/* Previous Assessments Card */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-green-300 group"
            onClick={() => completedAssessments.length > 0 && navigateTo('assessment-history')}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-4 rounded-2xl mb-4 group-hover:bg-green-200 transition-colors">
                  <User className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-gray-900 mb-2">{t.viewResults}</h3>
                <p className="text-gray-600 text-sm mb-4">{t.viewResultsDesc}</p>
                
                {completedAssessments.length > 0 ? (
                  <div className="bg-blue-50 px-4 py-2 rounded-full">
                    <span className="text-blue-700">{completedAssessments.length} {completedAssessments.length === 1 ? t.assessment : t.viewResults}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{t.noAssessments}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
