import { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, Lock, Trash2, Save, Eye, EyeOff, GraduationCap, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { LanguageSelector } from './LanguageSelector';
import { assessmentService } from '../services/assessmentService';
import { toast } from 'sonner';
import type { Page, UserProfile, Language } from '../App';

interface SettingsPageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  navigateTo: (page: Page) => void;
}

const translations = {
  en: {
    settings: 'Settings',
    accountSettings: 'Account Settings',
    accountDesc: 'Manage your account information and preferences',
    personalInfo: 'Personal Information',
    name: 'Name',
    namePlaceholder: 'Enter your name',
    grade: 'Grade/Class',
    gradePlaceholder: 'e.g., 10th',
    age: 'Age',
    agePlaceholder: 'Enter your age',
    email: 'Email Address',
    emailPlaceholder: 'Enter your email',
    phone: 'Phone Number',
    phonePlaceholder: 'Enter your phone number',
    security: 'Security',
    password: 'Password',
    passwordPlaceholder: 'Enter new password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    deleteDesc: 'Permanently delete your account and all associated data',
    deleteButton: 'Delete My Account',
    deleteConfirmTitle: 'Are you absolutely sure?',
    deleteConfirmDesc: 'This action cannot be undone. This will permanently delete your account and remove all your data from our servers.',
    cancel: 'Cancel',
    confirmDelete: 'Yes, Delete My Account',
    saveChanges: 'Save Changes',
    changesSaved: 'Changes saved successfully!',
    accountDeleted: 'Account has been deleted',
    language: 'Language',
    optional: '(Optional)'
  },
  hi: {
    settings: 'सेटिंग्स',
    accountSettings: 'खाता सेटिंग्स',
    accountDesc: 'अपनी खाता जानकारी और प्राथमिकताओं का प्रबंधन करें',
    personalInfo: 'व्यक्तिगत जानकारी',
    name: 'नाम',
    namePlaceholder: 'अपना नाम दर्ज करें',
    grade: 'कक्षा',
    gradePlaceholder: 'उदा., 10वीं',
    age: 'उम्र',
    agePlaceholder: 'अपनी उम्र दर्ज करें',
    email: 'ईमेल पता',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    phone: 'फ़ोन नंबर',
    phonePlaceholder: 'अपना फ़ोन नंबर दर्ज करें',
    security: 'सुरक्षा',
    password: 'पासवर्ड',
    passwordPlaceholder: 'नया पासवर्ड दर्ज करें',
    currentPassword: 'वर्तमान पासवर्ड',
    newPassword: 'नया पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    showPassword: 'पासवर्ड दिखाएं',
    hidePassword: 'पासवर्ड छिपाएं',
    dangerZone: 'खतरे का क्षेत्र',
    deleteAccount: 'खाता हटाएं',
    deleteDesc: 'अपने खाते और सभी संबंधित डेटा को स्थायी रूप से हटाएं',
    deleteButton: 'मेरा खाता हटाएं',
    deleteConfirmTitle: 'क्या आप पूरी तरह निश्चित हैं?',
    deleteConfirmDesc: 'इस कार्रवाई को पूर्ववत नहीं किया जा सकता। यह आपके खाते को स्थायी रूप से हटा देगा और हमारे सर्वर से आपका सभी डेटा हटा देगा।',
    cancel: 'रद्द करें',
    confirmDelete: 'हां, मेरा खाता हटाएं',
    saveChanges: 'परिवर्तन सहेजें',
    changesSaved: 'परिवर्तन सफलतापूर्वक सहेजे गए!',
    accountDeleted: 'खाता हटा दिया गया है',
    language: 'भाषा',
    optional: '(वैकल्पिक)'
  },
  te: {
    settings: 'సెట్టింగ్‌లు',
    accountSettings: 'ఖాతా సెట్టింగ్‌లు',
    accountDesc: 'మీ ఖాతా సమాచారం మరియు ప్రాధాన్యతలను నిర్వహించండి',
    personalInfo: 'వ్యక్తిగత సమాచారం',
    name: 'పేరు',
    namePlaceholder: 'మీ పేరు నమోదు చేయండి',
    grade: 'తరగతి',
    gradePlaceholder: 'ఉదా., 10వ తరగతి',
    age: 'వయస్సు',
    agePlaceholder: 'మీ వయస్సును నమోదు చేయండి',
    email: 'ఈమెయిల్ చిరునామా',
    emailPlaceholder: 'మీ ఈమెయిల్ నమోదు చేయండి',
    phone: 'ఫోన్ నంబర్',
    phonePlaceholder: 'మీ ఫోన్ నంబర్ నమోదు చేయండి',
    security: 'భద్రత',
    password: 'పాస్‌వర్డ్',
    passwordPlaceholder: 'కొత్త పాస్‌వర్డ్ నమోదు చేయండి',
    currentPassword: 'ప్రస్తుత పాస్‌వర్డ్',
    newPassword: 'కొత్త పాస్‌వర్డ్',
    confirmPassword: 'పాస్‌వర్డ్‌ను నిర్ధారించండి',
    showPassword: 'పాస్‌వర్డ్ చూపించు',
    hidePassword: 'పాస్‌వర్డ్ దాచు',
    dangerZone: 'ప్రమాద ప్రాంతం',
    deleteAccount: 'ఖాతాను తొలగించు',
    deleteDesc: 'మీ ఖాతా మరియు అన్ని సంబంధిత డేటాను శాశ్వతంగా తొలగించండి',
    deleteButton: 'నా ఖాతాను తొలగించు',
    deleteConfirmTitle: 'మీరు ఖచ్చితంగా నిశ్చయించుకున్నారా?',
    deleteConfirmDesc: 'ఈ చర్యను రద్దు చేయలేరు. ఇది మీ ఖాతాను శాశ్వతంగా తొలగిస్తుంది మరియు మా సర్వర్‌ల నుండి మీ డేటాను తొలగిస్తుంది.',
    cancel: 'రద్దు చేయి',
    confirmDelete: 'అవును, నా ఖాతాను తొలగించు',
    saveChanges: 'మార్పులను సేవ్ చేయి',
    changesSaved: 'మార్పులు విజయవంతంగా సేవ్ చేయబడ్డాయి!',
    accountDeleted: 'ఖాతా తొలగించబడింది',
    language: 'భాష',
    optional: '(ఐచ్ఛికం)'
  },
  ta: {
    settings: 'அமைப்புகள்',
    accountSettings: 'கணக்கு அமைப்புகள்',
    accountDesc: 'உங்கள் கணக்கு தகவல் மற்றும் விருப்பங்களை நிர்வகிக்கவும்',
    personalInfo: 'தனிப்பட்ட தகவல்',
    name: 'பெயர்',
    namePlaceholder: 'உங்கள் பெயரை உள்ளிடவும்',
    grade: 'வகுப்பு',
    gradePlaceholder: 'எ.கா., 10வது',
    age: 'வயது',
    agePlaceholder: 'உங்கள் வயதை உள்ளிடவும்',
    email: 'மின்னஞ்சல் முகவரி',
    emailPlaceholder: 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
    phone: 'தொலைபேசி எண்',
    phonePlaceholder: 'உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்',
    security: 'பாதுகாப்பு',
    password: 'கடவுச்சொல்',
    passwordPlaceholder: 'புதிய கடவுச்சொல்லை உள்ளிடவும்',
    currentPassword: 'தற்போதைய கடவுச்சொல்',
    newPassword: 'புதிய கடவுச்சொல்',
    confirmPassword: 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
    showPassword: 'கடவுச்சொல்லைக் காட்டு',
    hidePassword: 'கடவுச்சொல்லை மறை',
    dangerZone: 'ஆபத்து மண்டலம்',
    deleteAccount: 'கணக்கை நீக்கு',
    deleteDesc: 'உங்கள் கணக்கு மற்றும் அனைத்து தொடர்புடைய தரவையும் நிரந்தரமாக நீக்கவும்',
    deleteButton: 'என் கணக்கை நீக்கு',
    deleteConfirmTitle: 'நீங்கள் முற்றிலும் உறுதியாக இருக்கிறீர்களா?',
    deleteConfirmDesc: 'இந்த செயலை மீண்டும் செய்ய முடியாது. இது உங்கள் கணக்கை நிரந்தரமாக நீக்கி, எங்கள் சேவையகங்களில் இருந்து உங்கள் தரவை அகற்றும்.',
    cancel: 'ரத்து செய்',
    confirmDelete: 'ஆம், என் கணக்கை நீக்கு',
    saveChanges: 'மாற்றங்களைச் சேமி',
    changesSaved: 'மாற்றங்கள் வெற்றிகரமாகச் சேமிக்கப்பட்டன!',
    accountDeleted: 'கணக்கு நீக்கப்பட்டது',
    language: 'மொழி',
    optional: '(விருப்பமானது)'
  },
  bn: {
    settings: 'সেটিংস',
    accountSettings: 'অ্যাকাউন্ট সেটিংস',
    accountDesc: 'আপনার অ্যাকাউন্ট তথ্য এবং পছন্দগুলি পরিচালনা করুন',
    personalInfo: 'ব্যক্তিগত তথ্য',
    name: 'নাম',
    namePlaceholder: 'আপনার নাম লিখুন',
    grade: 'শ্রেণী',
    gradePlaceholder: 'যেমন, দশম',
    age: 'বয়স',
    agePlaceholder: 'আপনার বয়স লিখুন',
    email: 'ইমেল ঠিকানা',
    emailPlaceholder: 'আপনার ইমেল লিখুন',
    phone: 'ফোন নম্বর',
    phonePlaceholder: 'আপনার ফোন নম্বর লিখুন',
    security: 'নিরাপত্তা',
    password: 'পাসওয়ার্ড',
    passwordPlaceholder: 'নতুন পাসওয়ার্ড লিখুন',
    currentPassword: 'বর্তমান পাসওয়ার্ড',
    newPassword: 'নতুন পাসওয়ার্ড',
    confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
    showPassword: 'পাসওয়ার্ড দেখান',
    hidePassword: 'পাসওয়ার্ড লুকান',
    dangerZone: 'বিপদ অঞ্চল',
    deleteAccount: 'অ্যাকাউন্ট মুছুন',
    deleteDesc: 'আপনার অ্যাকাউন্ট এবং সমস্ত সংশ্লিষ্ট ডেটা স্থায়ীভাবে মুছুন',
    deleteButton: 'আমার অ্যাকাউন্ট মুছুন',
    deleteConfirmTitle: 'আপনি কি সম্পূর্ণ নিশ্চিত?',
    deleteConfirmDesc: 'এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি আপনার অ্যাকাউন্টটি স্থায়ীভাবে মুছে দেবে এবং আমাদের সার্ভার থেকে আপনার ডেটা সরিয়ে দেবে।',
    cancel: 'বাতিল করুন',
    confirmDelete: 'হ্যাঁ, আমার অ্যাকাউন্ট মুছুন',
    saveChanges: 'পরিবর্তন সংরক্ষণ করুন',
    changesSaved: 'পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে!',
    accountDeleted: 'অ্যাকাউন্ট মুছে ফেলা হয়েছে',
    language: 'ভাষা',
    optional: '(ঐচ্ছিক)'
  },
  gu: {
    settings: 'સેટિંગ્સ',
    accountSettings: 'એકાઉન્ટ સેટિંગ્સ',
    accountDesc: 'તમારી એકાઉન્ટ માહિતી અને પસંદગીઓ સંચાલિત કરો',
    personalInfo: 'વ્યક્તિગત માહિતી',
    name: 'નામ',
    namePlaceholder: 'તમારું નામ દાખલ કરો',
    grade: 'ધોરણ',
    gradePlaceholder: 'ઉદા., 10મું',
    age: 'ઉંમર',
    agePlaceholder: 'તમારી ઉંમર દાખલ કરો',
    email: 'ઈમેલ સરનામું',
    emailPlaceholder: 'તમારું ઈમેલ દાખલ કરો',
    phone: 'ફોન નંબર',
    phonePlaceholder: 'તમારો ફોન નંબર દાખલ કરો',
    security: 'સુરક્ષા',
    password: 'પાસવર્ડ',
    passwordPlaceholder: 'નવો પાસવર્ડ દાખલ કરો',
    currentPassword: 'વર્તમાન પાસવર્ડ',
    newPassword: 'નવો પાસવર્ડ',
    confirmPassword: 'પાસવર્ડની પુષ્ટિ કરો',
    showPassword: 'પાસવર્ડ બતાવો',
    hidePassword: 'પાસવર્ડ છુપાવો',
    dangerZone: 'જોખમ ક્ષેત્ર',
    deleteAccount: 'એકાઉન્ટ કાઢી નાખો',
    deleteDesc: 'તમારું એકાઉન્ટ અને તમામ સંલગ્ન ડેટાને કાયમ માટે કાઢી નાખો',
    deleteButton: 'મારું એકાઉન્ટ કાઢી નાખો',
    deleteConfirmTitle: 'શું તમે સંપૂર્ણપણે ખાતરી કરો છો?',
    deleteConfirmDesc: 'આ ક્રિયા પાછી લેવી શકાશે નહીં. આ તમારું એકાઉન્ટ કાયમ માટે કાઢી નાખશે અને અમારા સર્વર પરથી તમારો ડેટા દૂર કરશે.',
    cancel: 'રદ કરો',
    confirmDelete: 'હા, મારું એકાઉન્ટ કાઢી નાખો',
    saveChanges: 'ફેરફારો સાચવો',
    changesSaved: 'ફેરફારો સફળતાપૂર્વક સાચવ્યા!',
    accountDeleted: 'એકાઉન્ટ કાઢી નાખવામાં આવ્યું છે',
    language: 'ભાષા',
    optional: '(વૈકલ્પિક)'
  }
};

export function SettingsPage({ userProfile, setUserProfile, navigateTo }: SettingsPageProps) {
  const t = translations[userProfile.language];
  const [formData, setFormData] = useState({
    name: userProfile.name,
    grade: userProfile.class,
    age: userProfile.age || '',
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setUserProfile({ ...userProfile, language: lang });
    // Save language preference to localStorage immediately
    localStorage.setItem('pathfinder_user_language', lang);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear password error when user types
    if (field === 'currentPassword' || field === 'newPassword' || field === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setPasswordError('');

    try {
      // Validate password change if user is trying to change it
      if (formData.newPassword) {
        // Require current password to be entered
        if (!formData.currentPassword) {
          const errorMsg = userProfile.language === 'en' ? 'Please enter your current password' :
                          userProfile.language === 'hi' ? 'कृपया अपना वर्तमान पासवर्ड दर्ज करें' :
                          userProfile.language === 'te' ? 'దయచేసి మీ ప్రస్తుత పాస్‌వర్డ్‌ను నమోదు చేయండి' :
                          userProfile.language === 'ta' ? 'உங்கள் தற்போதைய கடவுச்சொல்லை உள்ளிடவும்' :
                          userProfile.language === 'bn' ? 'আপনার বর্তমান পাসওয়ার্ড লিখুন' :
                          'કૃપા કરીને તમારો વર્તમાન પાસવર્ડ દાખલ કરો';
          setPasswordError(errorMsg);
          toast.error(errorMsg);
          setIsSaving(false);
          return;
        }

        // Validate new password length (minimum 8 characters)
        if (formData.newPassword.length < 8) {
          const errorMsg = userProfile.language === 'en' ? 'Password must be at least 8 characters' :
                          userProfile.language === 'hi' ? 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए' :
                          userProfile.language === 'te' ? 'పాస్‌వర్డ్ కనీసం 8 అక్షరాలుగా ఉండాలి' :
                          userProfile.language === 'ta' ? 'கடவுச்சொல் குறைந்தது 8 எழுத்துக்கள் இருக்க வேண்டும்' :
                          userProfile.language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে 8 অক্ষরের হতে হবে' :
                          'પાસવર્ડ ઓછામાં ઓછા 8 અક્ષરોનો હોવો જોઈએ';
          setPasswordError(errorMsg);
          toast.error(errorMsg);
          setIsSaving(false);
          return;
        }

        // Validate new password matches confirm password
        if (formData.newPassword !== formData.confirmPassword) {
          const errorMsg = userProfile.language === 'en' ? 'New password and confirm password do not match' :
                          userProfile.language === 'hi' ? 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते' :
                          userProfile.language === 'te' ? 'కొత్త పాస్‌వర్డ్ మరియు నిర్ధారణ పాస్‌వర్డ్ సరిపోలడం లేదు' :
                          userProfile.language === 'ta' ? 'புதிய கடவுச்சொல் மற்றும் உறுதிப்படுத்தல் கடவுச்சொல் பொருந்தவில்லை' :
                          userProfile.language === 'bn' ? 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলে না' :
                          'નવો પાસવર્ડ અને પુષ્ટિકરણ પાસવર્ડ મેળ ખાતા નથી';
          setPasswordError(errorMsg);
          toast.error(errorMsg);
          setIsSaving(false);
          return;
        }
      }

      // Prepare update data
      const updateData: any = {
        name: formData.name,
        grade: formData.grade,
        age: formData.age || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      };

      // Add password fields if changing password
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      // Call backend API to update profile
      const response = await assessmentService.updateProfile(updateData);
      
      if (response.data.success) {
        // Update local state
        const updatedProfile: UserProfile = {
          ...userProfile,
          name: response.data.user.name,
          class: response.data.user.grade,
          age: response.data.user.age?.toString(),
          email: response.data.user.email,
          phone: response.data.user.phone,
        };
        
        setUserProfile(updatedProfile);
        
        // Save to localStorage
        localStorage.setItem('pathfinder_user_name', response.data.user.name);
        localStorage.setItem('pathfinder_user_grade', response.data.user.grade);
        if (response.data.user.age) {
          localStorage.setItem('pathfinder_user_age', response.data.user.age.toString());
        }
        
        // Clear password fields after successful save
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        toast.success(t.changesSaved);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      setPasswordError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    toast.success(t.accountDeleted);
    // Reset to default profile
    setUserProfile({
      name: '<Student name>',
      class: '10th',
      language: 'en'
    });
    navigateTo('home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigateTo('home')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-gray-900">{t.settings}</h1>
            </div>
            <LanguageSelector 
              language={userProfile.language}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t.accountSettings}</CardTitle>
            <CardDescription>{t.accountDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h3 className="mb-4 text-gray-900">{t.personalInfo}</h3>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <Label htmlFor="name">{t.name}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Grade */}
                <div>
                  <Label htmlFor="grade">{t.grade}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => handleInputChange('grade', e.target.value)}
                      placeholder={t.gradePlaceholder}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Age */}
                <div>
                  <Label htmlFor="age">{t.age} {t.optional}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      placeholder={t.agePlaceholder}
                      className="flex-1"
                      min="10"
                      max="25"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">{t.email} {t.optional}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone">{t.phone} {t.optional}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder={t.phonePlaceholder}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="pt-6 border-t">
              <h3 className="mb-4 text-gray-900">{t.security}</h3>
              <div className="space-y-4">
                {/* Current Password - required when changing password */}
                <div>
                  <Label htmlFor="currentPassword">{t.currentPassword}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        placeholder={t.currentPassword}
                        className={passwordError ? 'border-red-500' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <Label htmlFor="newPassword">{t.newPassword}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        placeholder={t.passwordPlaceholder}
                        className={passwordError ? 'border-red-500' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder={t.confirmPassword}
                        className={passwordError ? 'border-red-500' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordError && (
                  <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? (userProfile.language === 'en' ? 'Saving...' : 'सहेजा जा रहा है...') : t.saveChanges}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">{t.dangerZone}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-gray-900">{t.deleteAccount}</h3>
                <p className="text-sm text-gray-600 mt-1">{t.deleteDesc}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2 sm:w-auto w-full">
                    <Trash2 className="h-4 w-4" />
                    {t.deleteButton}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.deleteConfirmDesc}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {t.confirmDelete}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
