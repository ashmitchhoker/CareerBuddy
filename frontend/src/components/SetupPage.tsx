import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LanguageSelector } from './LanguageSelector';
import { authService } from '../services/authService';
import { toast } from 'sonner';
import type { Page, UserProfile, Language } from '../App';

interface SetupPageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  navigateTo: (page: Page) => void;
  onSetupComplete: () => void;
}

const translations = {
  en: {
    welcome: 'Welcome to PathFinder',
    subtitle: 'Your Career Guidance Companion',
    description: 'Let\'s get started by collecting some basic information',
    nameLabel: 'Name',
    namePlaceholder: 'your name',
    gradeLabel: 'Grade/Class',
    gradePlaceholder: 'e.g. 10',
    ageLabel: 'Age',
    agePlaceholder: 'Enter your age',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Choose a username',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Choose a password',
    alreadyHaveAccount: 'Already have an account?',
    signInInstead: 'Sign In Instead',
    consentLabel: 'I consent to sharing my information for career guidance purposes',
    language: 'Language',
    getStarted: 'Get Started',
    required: 'This field is required',
    consentRequired: 'Please consent to continue',
    note: 'Note: Your information will only be used to provide personalized career guidance and will be kept confidential.'
  },
  hi: {
    welcome: 'पाथफाइंडर में आपका स्वागत है',
    subtitle: 'आपका करियर मार्गदर्शन साथी',
    description: 'आइए कुछ बुनियादी जानकारी एकत्र करके शुरुआत करें',
    nameLabel: 'पूरा नाम',
    namePlaceholder: 'अपना पूरा नाम दर्ज करें',
    gradeLabel: 'कक्षा',
    gradePlaceholder: 'उदा., 10वीं',
    ageLabel: 'उम्र',
    agePlaceholder: 'अपनी उम्र दर्ज करें',
    usernameLabel: 'उपयोगकर्ता नाम',
    usernamePlaceholder: 'एक उपयोगकर्ता नाम चुनें',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'एक पासवर्ड चुनें',
    alreadyHaveAccount: 'पहले से खाता है?',
    signInInstead: 'इसके बजाय साइन इन करें',
    consentLabel: 'मैं करियर मार्गदर्शन उद्देश्यों के लिए अपनी जानकारी साझा करने के लिए सहमत हूं',
    language: 'भाषा',
    getStarted: 'शुरू करें',
    required: 'यह फ़ील्ड आवश्यक है',
    consentRequired: 'जारी रखने के लिए कृपया सहमति दें',
    note: 'नोट: आपकी जानकारी का उपयोग केवल व्यक्तिगत करियर मार्गदर्शन प्रदान करने के लिए किया जाएगा और इसे गोपनीय रखा जाएगा।'
  },
  te: {
    welcome: 'పాత్‌ఫైండర్‌కు స్వాగతం',
    subtitle: 'మీ కెరీర్ మార్గదర్శక సహచరుడు',
    description: 'కొన్ని ప్రాథమిక సమాచారాన్ని సేకరించడం ద్వారా ప్రారంభిద్దాం',
    nameLabel: 'పూర్తి పేరు',
    namePlaceholder: 'మీ పూర్తి పేరును నమోదు చేయండి',
    gradeLabel: 'తరగతి',
    gradePlaceholder: 'ఉదా., 10వ తరగతి',
    ageLabel: 'వయస్సు',
    agePlaceholder: 'మీ వయస్సును నమోదు చేయండి',
    usernameLabel: 'వినియోగదారు పేరు',
    usernamePlaceholder: 'వినియోగదారు పేరును ఎంచుకోండి',
    passwordLabel: 'పాస్‌వర్డ్',
    passwordPlaceholder: 'పాస్‌వర్డ్‌ను ఎంచుకోండి',
    alreadyHaveAccount: 'ఇప్పటికే ఖాతా ఉందా?',
    signInInstead: 'బదులుగా సైన్ ఇన్ చేయండి',
    consentLabel: 'కెరీర్ మార్గదర్శకత్వ ప్రయోజనాల కోసం నా సమాచారాన్ని పంచుకోవడానికి నేను అంగీకరిస్తున్నాను',
    language: 'భాష',
    getStarted: 'ప్రారంభించండి',
    required: 'ఈ ఫీల్డ్ తప్పనిసరి',
    consentRequired: 'కొనసాగించడానికి దయచేసి సమ్మతించండి',
    note: 'గమనిక: మీ సమాచారం వ్యక్తిగత కెరీర్ మార్గదర్శకత్వాన్ని అందించడానికి మాత్రమే ఉపయోగించబడుతుంది మరియు గోప్యంగా ఉంచబడుతుంది.'
  },
  ta: {
    welcome: 'PathFinder க்கு வரவேற்கிறோம்',
    subtitle: 'உங்கள் தொழில் வழிகாட்டி துணை',
    description: 'சில அடிப்படை தகவல்களைச் சேகரித்து தொடங்குவோம்',
    nameLabel: 'முழு பெயர்',
    namePlaceholder: 'உங்கள் முழு பெயரை உள்ளிடவும்',
    gradeLabel: 'வகுப்பு',
    gradePlaceholder: 'எ.கா., 10வது',
    ageLabel: 'வயது',
    agePlaceholder: 'உங்கள் வயதை உள்ளிடவும்',
    usernameLabel: 'பயனர் பெயர்',
    usernamePlaceholder: 'பயனர் பெயரைத் தேர்ந்தெடுக்கவும்',
    passwordLabel: 'கடவுச்சொல்',
    passwordPlaceholder: 'கடவுச்சொல்லைத் தேர்ந்தெடுக்கவும்',
    alreadyHaveAccount: 'ஏற்கனவே கணக்கு உள்ளதா?',
    signInInstead: 'அதற்கு பதிலாக உள்நுழையவும்',
    consentLabel: 'தொழில் வழிகாட்டுதல் நோக்கங்களுக்காக எனது தகவலைப் பகிர்ந்து கொள்ள ஒப்புக்கொள்கிறேன்',
    language: 'மொழி',
    getStarted: 'தொடங்கவும்',
    required: 'இந்த புலம் அவசியம்',
    consentRequired: 'தொடர தயவுசெய்து ஒப்புக்கொள்ளவும்',
    note: 'குறிப்பு: உங்கள் தகவல் தனிப்பயனாக்கப்பட்ட தொழில் வழிகாட்டுதலை வழங்க மட்டுமே பயன்படுத்தப்படும் மற்றும் ரகசியமாக வைக்கப்படும்.'
  },
  bn: {
    welcome: 'PathFinder এ স্বাগতম',
    subtitle: 'আপনার ক্যারিয়ার গাইডেন্স সঙ্গী',
    description: 'চলুন কিছু মৌলিক তথ্য সংগ্রহ করে শুরু করি',
    nameLabel: 'পুরো নাম',
    namePlaceholder: 'আপনার পুরো নাম লিখুন',
    gradeLabel: 'শ্রেণী',
    gradePlaceholder: 'যেমন, দশম',
    ageLabel: 'বয়স',
    agePlaceholder: 'আপনার বয়স লিখুন',
    usernameLabel: 'ব্যবহারকারীর নাম',
    usernamePlaceholder: 'একটি ব্যবহারকারীর নাম বেছে নিন',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: 'একটি পাসওয়ার্ড বেছে নিন',
    alreadyHaveAccount: 'ইতিমধ্যে একটি অ্যাকাউন্ট আছে?',
    signInInstead: 'পরিবর্তে সাইন ইন করুন',
    consentLabel: 'আমি ক্যারিয়ার গাইডেন্স উদ্দেশ্যে আমার তথ্য শেয়ার করতে সম্মত',
    language: 'ভাষা',
    getStarted: 'শুরু করুন',
    required: 'এই ক্ষেত্রটি আবশ্যক',
    consentRequired: 'অগ্রসর হতে অনুগ্রহ করে সম্মতি দিন',
    note: 'নোট: আপনার তথ্য শুধুমাত্র ব্যক্তিগতকৃত ক্যারিয়ার গাইডেন্স প্রদানের জন্য ব্যবহৃত হবে এবং গোপনীয় রাখা হবে।'
  },
  gu: {
    welcome: 'PathFinder માં આપનું સ્વાગત છે',
    subtitle: 'તમારો કારકિર્દી માર્ગદર્શન સાથી',
    description: 'ચાલો કેટલીક મૂળભૂત માહિતી એકત્રિત કરીને શરૂઆત કરીએ',
    nameLabel: 'પૂરું નામ',
    namePlaceholder: 'તમારું પૂરું નામ દાખલ કરો',
    gradeLabel: 'ધોરણ',
    gradePlaceholder: 'ઉદા., 10મું',
    ageLabel: 'ઉંમર',
    agePlaceholder: 'તમારી ઉંમર દાખલ કરો',
    usernameLabel: 'વપરાશકર્તા નામ',
    usernamePlaceholder: 'વપરાશકર્તા નામ પસંદ કરો',
    passwordLabel: 'પાસવર્ડ',
    passwordPlaceholder: 'પાસવર્ડ પસંદ કરો',
    alreadyHaveAccount: 'પહેલેથી જ એકાઉન્ટ છે?',
    signInInstead: 'તેના બદલે સાઇન ઇન કરો',
    consentLabel: 'હું કારકિર્દી માર્ગદર્શન હેતુઓ માટે મારી માહિતી શેર કરવા માટે સંમતિ આપું છું',
    language: 'ભાષા',
    getStarted: 'શરૂઆત કરો',
    required: 'આ ફીલ્ડ જરૂરી છે',
    consentRequired: 'કૃપા કરીને ચાલુ રાખવા માટે સંમતિ આપો',
    note: 'નોંધ: તમારી માહિતીનો ઉપયોગ ફક્ત વ્યક્તિગત કારકિર્દી માર્ગદર્શન પ્રદાન કરવા માટે કરવામાં આવશે અને ગોપનીય રાખવામાં આવશે.'
  }
};

export function SetupPage({ userProfile, setUserProfile, navigateTo, onSetupComplete }: SetupPageProps) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('10th');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const lang = userProfile.language;
  const t = translations[lang];

  const handleLanguageChange = (newLanguage: Language) => {
    setUserProfile({ ...userProfile, language: newLanguage });
    // Immediately save language preference to localStorage so it persists across all screens
    localStorage.setItem('pathfinder_user_language', newLanguage);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = t.required;
    }

    if (!grade.trim()) {
      newErrors.grade = t.required;
    }

    if (!age.trim()) {
      newErrors.age = t.required;
    }

    if (!username.trim()) {
      newErrors.username = t.required || 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!password.trim()) {
      newErrors.password = t.required || 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!consent) {
      newErrors.consent = t.consentRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create user account via API
      const user = await authService.setup({
        username: username.trim(),
        password: password,
        name: name.trim(),
        grade: grade.trim(),
        age: age.trim() || undefined,
        email: '',
        phone: '',
      });

      // Update user profile with data from server
      const updatedProfile: UserProfile = {
        ...userProfile,
        name: user.name || name.trim(),
        class: user.grade || grade.trim(),
        age: user.age?.toString() || age.trim(),
        language: userProfile.language,
      };
      setUserProfile(updatedProfile);

      // Store setup completion in localStorage
      localStorage.setItem('pathfinder_setup_complete', 'true');
      localStorage.setItem('pathfinder_user_name', name.trim());
      localStorage.setItem('pathfinder_user_grade', grade.trim());
      localStorage.setItem('pathfinder_user_age', age.trim());
      localStorage.setItem('pathfinder_user_language', userProfile.language);

      toast.success('Account created successfully!');
      
      // Mark setup as complete
      onSetupComplete();
      
      // Navigate to home
      navigateTo('home');
    } catch (error: any) {
      console.error('Setup error:', error);
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || error.message || 'Failed to create account';
      
      // Handle field-specific errors
      if (errorData?.details) {
        const fieldErrors: { [key: string]: string } = {};
        Object.entries(errorData.details).forEach(([field, message]) => {
          if (message) {
            fieldErrors[field] = message as string;
          }
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
      } else if (errorMessage.includes('Username already exists')) {
        setErrors({ username: 'Username already exists. Please choose another.' });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-full">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to CareerBuddy
          </CardTitle>
          <CardDescription className="text-base">
            Your Career Guidance Companion
          </CardDescription>
          <p className="text-sm text-muted-foreground pt-2">
            {t.description}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Language Selector */}
            <div className="space-y-2">
              <Label>{t.language}</Label>
              <LanguageSelector
                language={userProfile.language}
                onLanguageChange={handleLanguageChange}
              />
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">{t.nameLabel} *</Label>
              <Input
                id="name"
                type="text"
                placeholder={t.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Grade Field */}
            <div className="space-y-2">
              <Label htmlFor="grade">{t.gradeLabel} *</Label>
              <Input
                id="grade"
                type="text"
                placeholder={t.gradePlaceholder}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className={errors.grade ? 'border-red-500' : ''}
              />
              {errors.grade && (
                <p className="text-sm text-red-500">{errors.grade}</p>
              )}
            </div>

            {/* Age Field */}
            <div className="space-y-2">
              <Label htmlFor="age">{t.ageLabel} *</Label>
              <Input
                id="age"
                type="number"
                placeholder={t.agePlaceholder}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={errors.age ? 'border-red-500' : ''}
                min="10"
                max="25"
              />
              {errors.age && (
                <p className="text-sm text-red-500">{errors.age}</p>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">{t.usernameLabel} *</Label>
              <Input
                id="username"
                type="text"
                placeholder={t.usernamePlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">{t.passwordLabel} *</Label>
              <Input
                id="password"
                type="password"
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Consent Checkbox */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked as boolean)}
                  className={errors.consent ? 'border-red-500' : ''}
                />
                <Label 
                  htmlFor="consent" 
                  className="text-sm leading-tight cursor-pointer"
                >
                  {t.consentLabel}
                </Label>
              </div>
              {errors.consent && (
                <p className="text-sm text-red-500">{errors.consent}</p>
              )}
            </div>

            {/* Privacy Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                {t.note}
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : t.getStarted}
            </Button>

            {/* Sign In Link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">
                {t.alreadyHaveAccount}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigateTo('login')}
              >
                {t.signInInstead}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
