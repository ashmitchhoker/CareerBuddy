import { useState, useRef, useEffect } from 'react';
import { GraduationCap, LogIn, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LanguageSelector } from './LanguageSelector';
import { authService } from '../services/authService';
import { toast } from 'sonner';
import type { Page, UserProfile, Language } from '../App';

interface LoginPageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  navigateTo: (page: Page) => void;
  onLoginComplete: () => void;
  onShowSignup: () => void;
  onGuestMode: () => void;
}

const translations = {
  en: {
    welcomeBack: 'Welcome Back',
    subtitle: 'Sign in to continue your career journey',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    noAccount: "Don't have an account?",
    createAccount: 'Create New Account',
    continueAsGuest: 'Continue as Guest',
    usernameRequired: 'Username is required',
    passwordRequired: 'Password is required',
    invalidCredentials: 'Invalid username or password',
    loginSuccess: 'Logged in successfully!',
    loginFailed: 'Failed to login'
  },
  hi: {
    welcomeBack: 'वापसी पर स्वागत है',
    subtitle: 'अपनी करियर यात्रा जारी रखने के लिए साइन इन करें',
    username: 'उपयोगकर्ता नाम',
    usernamePlaceholder: 'अपना उपयोगकर्ता नाम दर्ज करें',
    password: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    signIn: 'साइन इन करें',
    signingIn: 'साइन इन हो रहा है...',
    noAccount: 'खाता नहीं है?',
    createAccount: 'नया खाता बनाएं',
    continueAsGuest: 'अतिथि के रूप में जारी रखें',
    usernameRequired: 'उपयोगकर्ता नाम आवश्यक है',
    passwordRequired: 'पासवर्ड आवश्यक है',
    invalidCredentials: 'अमान्य उपयोगकर्ता नाम या पासवर्ड',
    loginSuccess: 'सफलतापूर्वक लॉग इन किया गया!',
    loginFailed: 'लॉग इन करने में विफल'
  },
  te: {
    welcomeBack: 'మళ్ళీ స్వాగతం',
    subtitle: 'మీ కెరీర్ ప్రయాణాన్ని కొనసాగించడానికి సైన్ ఇన్ చేయండి',
    username: 'వినియోగదారు పేరు',
    usernamePlaceholder: 'మీ వినియోగదారు పేరును నమోదు చేయండి',
    password: 'పాస్‌వర్డ్',
    passwordPlaceholder: 'మీ పాస్‌వర్డ్‌ను నమోదు చేయండి',
    signIn: 'సైన్ ఇన్ చేయండి',
    signingIn: 'సైన్ ఇన్ అవుతోంది...',
    noAccount: 'ఖాతా లేదా?',
    createAccount: 'కొత్త ఖాతా సృష్టించండి',
    continueAsGuest: 'అతిథిగా కొనసాగించండి',
    usernameRequired: 'వినియోగదారు పేరు అవసరం',
    passwordRequired: 'పాస్‌వర్డ్ అవసరం',
    invalidCredentials: 'చెల్లని వినియోగదారు పేరు లేదా పాస్‌వర్డ్',
    loginSuccess: 'విజయవంతంగా లాగిన్ అయ్యారు!',
    loginFailed: 'లాగిన్ చేయడంలో విఫలమైంది'
  },
  ta: {
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்',
    subtitle: 'உங்கள் தொழில் பயணத்தைத் தொடர உள்நுழையவும்',
    username: 'பயனர் பெயர்',
    usernamePlaceholder: 'உங்கள் பயனர் பெயரை உள்ளிடவும்',
    password: 'கடவுச்சொல்',
    passwordPlaceholder: 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்',
    signIn: 'உள்நுழையவும்',
    signingIn: 'உள்நுழைகிறது...',
    noAccount: 'கணக்கு இல்லையா?',
    createAccount: 'புதிய கணக்கை உருவாக்கவும்',
    continueAsGuest: 'விருந்தினராகத் தொடரவும்',
    usernameRequired: 'பயனர் பெயர் தேவை',
    passwordRequired: 'கடவுச்சொல் தேவை',
    invalidCredentials: 'தவறான பயனர் பெயர் அல்லது கடவுச்சொல்',
    loginSuccess: 'வெற்றிகரமாக உள்நுழைந்துள்ளீர்கள்!',
    loginFailed: 'உள்நுழைவதில் தோல்வி'
  },
  bn: {
    welcomeBack: 'আবার স্বাগতম',
    subtitle: 'আপনার ক্যারিয়ার যাত্রা চালিয়ে যেতে সাইন ইন করুন',
    username: 'ব্যবহারকারীর নাম',
    usernamePlaceholder: 'আপনার ব্যবহারকারীর নাম লিখুন',
    password: 'পাসওয়ার্ড',
    passwordPlaceholder: 'আপনার পাসওয়ার্ড লিখুন',
    signIn: 'সাইন ইন করুন',
    signingIn: 'সাইন ইন করা হচ্ছে...',
    noAccount: 'অ্যাকাউন্ট নেই?',
    createAccount: 'নতুন অ্যাকাউন্ট তৈরি করুন',
    continueAsGuest: 'অতিথি হিসাবে চালিয়ে যান',
    usernameRequired: 'ব্যবহারকারীর নাম প্রয়োজন',
    passwordRequired: 'পাসওয়ার্ড প্রয়োজন',
    invalidCredentials: 'অবৈধ ব্যবহারকারীর নাম বা পাসওয়ার্ড',
    loginSuccess: 'সফলভাবে লগইন হয়েছে!',
    loginFailed: 'লগইন করতে ব্যর্থ'
  },
  gu: {
    welcomeBack: 'ફરી સ્વાગત છે',
    subtitle: 'તમારી કારકિર્દીની યાત્રા ચાલુ રાખવા માટે સાઇન ઇન કરો',
    username: 'વપરાશકર્તા નામ',
    usernamePlaceholder: 'તમારું વપરાશકર્તા નામ દાખલ કરો',
    password: 'પાસવર્ડ',
    passwordPlaceholder: 'તમારો પાસવર્ડ દાખલ કરો',
    signIn: 'સાઇન ઇન કરો',
    signingIn: 'સાઇન ઇન થઈ રહ્યું છે...',
    noAccount: 'એકાઉન્ટ નથી?',
    createAccount: 'નવું એકાઉન્ટ બનાવો',
    continueAsGuest: 'મહેમાન તરીકે ચાલુ રાખો',
    usernameRequired: 'વપરાશકર્તા નામ જરૂરી છે',
    passwordRequired: 'પાસવર્ડ જરૂરી છે',
    invalidCredentials: 'અમાન્ય વપરાશકર્તા નામ અથવા પાસવર્ડ',
    loginSuccess: 'સફળતાપૂર્વક લૉગ ઇન થયું!',
    loginFailed: 'લૉગ ઇન કરવામાં અસફળ'
  }
};

export function LoginPage({ 
  userProfile, 
  setUserProfile, 
  navigateTo, 
  onLoginComplete,
  onShowSignup,
  onGuestMode
}: LoginPageProps) {
  // Use localStorage to persist username across re-renders
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('pathfinder_login_username') || '';
  });
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>(''); // Separate state for login error that persists
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  
  // Save username to localStorage whenever it changes
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    localStorage.setItem('pathfinder_login_username', value);
  };

  const t = translations[userProfile.language];
  
  // Effect to restore error if it gets cleared while password is empty
  useEffect(() => {
    // If password is empty and we had a login error but it got cleared, restore it
    if (password === '' && !loginError && !errors.password) {
      // Check if we just had a login attempt (loading just finished with error)
      // This is a safety net to restore the error if something clears it
      const savedError = sessionStorage.getItem('pathfinder_last_login_error');
      if (savedError) {
        setLoginError(savedError);
        // Only set password error, no username error - use function form
        setErrors(() => ({ password: savedError }));
      }
    }
  }, [password, loginError, errors.password]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!username.trim()) {
      newErrors.username = t.usernameRequired;
    }

    if (!password.trim()) {
      newErrors.password = t.passwordRequired;
    }

    // Only set errors for fields that have validation issues
    // Use function form to ensure we're working with the latest state
    setErrors(() => newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling that might trigger browser validation

    // Clear any existing errors before validation
    // Use function form to ensure we're clearing the latest state
    setErrors(() => ({}));
    setLoginError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const user = await authService.login({
        username: username.trim(),
        password: password,
      });

      // Update user profile with data from server, preserving selected language
      const updatedProfile: UserProfile = {
        ...userProfile,
        name: user.name || userProfile.name,
        class: user.grade || userProfile.class,
        age: user.age?.toString() || userProfile.age,
        language: userProfile.language, // Keep the selected language
      };
      setUserProfile(updatedProfile);
      
      // Save language preference to localStorage
      localStorage.setItem('pathfinder_user_language', userProfile.language);

      // Store in localStorage
      localStorage.setItem('pathfinder_setup_complete', 'true');
      localStorage.setItem('pathfinder_user_name', user.name || '');
      localStorage.setItem('pathfinder_user_grade', user.grade || '');
      if (user.age) {
        localStorage.setItem('pathfinder_user_age', user.age.toString());
      }

      // Clear saved username and any error state on successful login
      localStorage.removeItem('pathfinder_login_username');
      sessionStorage.removeItem('pathfinder_last_login_error');
      setLoginError('');
      
      toast.success(t.loginSuccess);
      onLoginComplete();
      navigateTo('home');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || t.loginFailed;
      
      // Set error message - always show invalid credentials for login failures
      const displayError = t.invalidCredentials;
      
      // IMPORTANT: Only clear password, preserve username
      // The username value should remain so user doesn't have to retype it
      // Username is stored in localStorage, so it will persist even if component re-renders
      
      // Save error to sessionStorage as backup
      sessionStorage.setItem('pathfinder_last_login_error', displayError);
      
      // CRITICAL: Clear browser validation state for username field
      // Use ref if available, otherwise fallback to getElementById
      const usernameInput = usernameInputRef.current || (document.getElementById('username') as HTMLInputElement);
      if (usernameInput) {
        usernameInput.setCustomValidity('');
        // Remove any browser validation styling
        usernameInput.style.boxShadow = 'none';
        usernameInput.style.outline = 'none';
        // Add CSS class to hide browser validation styling
        usernameInput.classList.add('no-browser-validation');
        // Force browser to re-evaluate validation state
        setTimeout(() => {
          usernameInput.blur();
          usernameInput.focus();
          usernameInput.blur();
        }, 0);
      }
      
      // CRITICAL: Explicitly clear ALL errors and set ONLY password error
      // Use a function to ensure we're working with the latest state
      setLoginError(displayError);
      setErrors(() => {
        // Return a completely new object with ONLY password error
        // This ensures username error is never present
        return { password: displayError };
      });
      
      // Use a small delay before clearing password to ensure error state is set
      setTimeout(() => {
        setPassword('');
        
        // Double-check error is still set after clearing password
        setTimeout(() => {
          if (!loginError && password === '') {
            setLoginError(displayError);
            // Only set password error, no username error - use function form
            setErrors(() => ({ password: displayError }));
          }
        }, 50);
      }, 10);
      
      // Show toast notification
      toast.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setUserProfile({ ...userProfile, language: lang });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1"></div>
            <div className="flex justify-center flex-1">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-full">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <LanguageSelector
                language={userProfile.language}
                onLanguageChange={handleLanguageChange}
              />
            </div>
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t.welcomeBack}
          </CardTitle>
          <CardDescription className="text-base">
            {t.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">{t.username} *</Label>
              <Input
                ref={usernameInputRef}
                id="username"
                type="text"
                placeholder={t.usernamePlaceholder}
                value={username}
                onChange={(e) => {
                  handleUsernameChange(e.target.value);
                  // Clear username error when user types
                  if (errors.username) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.username;
                      return newErrors;
                    });
                  }
                  // Clear browser validation state when user types
                  e.currentTarget.setCustomValidity('');
                }}
                // Only show red border if there's a username-specific error, NOT for login errors
                className={errors.username && !loginError ? 'border-red-500' : ''}
                autoComplete="username"
                // CRITICAL: Never set aria-invalid to true when there's a login error
                // This prevents the Input component's CSS from showing red styling
                aria-invalid={errors.username && !loginError ? 'true' : undefined}
                // Hide browser validation styling with CSS
                style={{
                  boxShadow: 'none',
                  outline: 'none',
                }}
                // Explicitly prevent browser validation styling
                onInvalid={(e) => {
                  // Prevent browser's default invalid styling
                  e.preventDefault();
                  e.stopPropagation();
                  // Clear custom validity to prevent browser validation feedback
                  e.currentTarget.setCustomValidity('');
                }}
                onBlur={(e) => {
                  // Remove any browser validation styling on blur
                  e.currentTarget.setCustomValidity('');
                }}
              />
              {errors.username && !loginError && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">{t.password} *</Label>
              <Input
                ref={passwordInputRef}
                id="password"
                type="password"
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => {
                  const newPassword = e.target.value;
                  const oldPassword = password;
                  
                  setPassword(newPassword);
                  
                  // CRITICAL: Only clear error when user actively types NEW characters
                  // NEVER clear error when:
                  // 1. Password becomes empty (was programmatically cleared)
                  // 2. Password length decreases (user is deleting, not typing new content)
                  // Only clear when password length increases (user is typing new content)
                  
                  if (newPassword.length > oldPassword.length && newPassword.length > 0) {
                    // User is actively typing new characters - clear the error
                    sessionStorage.removeItem('pathfinder_last_login_error');
                    if (loginError) {
                      setLoginError('');
                    }
                    if (errors.password) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.password;
                        return newErrors;
                      });
                    }
                  } else if (newPassword.length === 0 && oldPassword.length > 0) {
                    // Password was cleared - restore error if it exists in sessionStorage
                    const savedError = sessionStorage.getItem('pathfinder_last_login_error');
                    if (savedError && !loginError) {
                      setLoginError(savedError);
                      // Only set password error, no username error - use function form
                      setErrors(() => ({ password: savedError }));
                    }
                  }
                  // If password length decreased but not empty, keep error visible
                }}
                className={(errors.password || loginError) ? 'border-red-500' : ''}
                autoComplete="current-password"
              />
              {(errors.password || loginError) && (
                <p className="text-sm text-red-500 mt-1">{errors.password || loginError}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={loading}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? t.signingIn : t.signIn}
            </Button>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t space-y-3">
              <p className="text-sm text-gray-600 mb-2">
                {t.noAccount}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onShowSignup}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t.createAccount}
              </Button>
              
              {/* Continue as Guest */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-600 hover:text-gray-900"
                  onClick={onGuestMode}
                >
                  {t.continueAsGuest}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

