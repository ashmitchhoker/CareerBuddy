import { useState, useEffect } from 'react';
import { ArrowLeft, ClipboardList, MessageCircle, FileText, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { LanguageSelector } from './LanguageSelector';
import { assessmentService } from '../services/assessmentService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import type { Page, UserProfile, CompletedAssessment, Language, TestType } from '../App';

const translations = {
  en: {
    title: 'Assessment History',
    subtitle: 'View your completed assessments',
    noAssessments: 'No assessments completed yet',
    assessment: 'Assessment',
    completedOn: 'Completed on',
    viewResponses: 'View Responses',
    viewChatHistory: 'Chat History',
    delete: 'Delete',
    deleteTitle: 'Delete Assessment',
    deleteDescription: 'Are you sure you want to delete this assessment? This will permanently delete the assessment, all test responses, and chat history. This action cannot be undone.',
    deleteButton: 'Delete',
    cancel: 'Cancel',
    deleting: 'Deleting...',
    at: 'at'
  },
  hi: {
    title: 'मूल्यांकन इतिहास',
    subtitle: 'अपने पूर्ण मूल्यांकन देखें',
    noAssessments: 'अभी तक कोई मूल्यांकन पूर्ण नहीं',
    assessment: 'मूल्यांकन',
    completedOn: 'पूर्ण किया',
    viewResponses: 'प्रतिक्रियाएं देखें',
    viewChatHistory: 'चैट इतिहास',
    delete: 'हटाएं',
    deleteTitle: 'मूल्यांकन हटाएं',
    deleteDescription: 'क्या आप वाकई इस मूल्यांकन को हटाना चाहते हैं? यह मूल्यांकन, सभी परीक्षण प्रतिक्रियाएं और चैट इतिहास को स्थायी रूप से हटा देगा। इस क्रिया को पूर्ववत नहीं किया जा सकता।',
    deleteButton: 'हटाएं',
    cancel: 'रद्द करें',
    deleting: 'हटा रहे हैं...',
    at: 'को'
  },
  te: {
    title: 'అసెస్‌మెంట్ చరిత్ర',
    subtitle: 'మీ పూర్తి అసెస్‌మెంట్లు చూడండి',
    noAssessments: 'ఇంకా అసెస్‌మెంట్లు పూర్తి కాలేదు',
    assessment: 'అసెస్‌మెంట్',
    completedOn: 'పూర్తి అయ్యింది',
    viewResponses: 'ప్రతిస్పందనలు చూడండి',
    viewChatHistory: 'చాట్ చరిత్ర',
    delete: 'తొలగించు',
    deleteTitle: 'అసెస్‌మెంట్ తొలగించు',
    deleteDescription: 'మీరు నిజంగా ఈ అసెస్‌మెంట్‌ను తొలగించాలనుకుంటున్నారా? ఇది అసెస్‌మెంట్, అన్ని పరీక్ష ప్రతిస్పందనలు మరియు చాట్ చరిత్రను శాశ్వతంగా తొలగిస్తుంది. ఈ చర్యను రద్దు చేయలేరు.',
    deleteButton: 'తొలగించు',
    cancel: 'రద్దు చేయి',
    deleting: 'తొలగిస్తోంది...',
    at: 'న'
  },
  ta: {
    title: 'மதிப்பீடு வரலாறு',
    subtitle: 'முடிந்த மதிப்பீடுகளைப் பார்க்கவும்',
    noAssessments: 'இன்னும் மதிப்பீடுகள் முடிக்கப்படவில்லை',
    assessment: 'மதிப்பீடு',
    completedOn: 'முடிக்கப்பட்டது',
    viewResponses: 'பதில்களைப் பார்க்கவும்',
    viewChatHistory: 'அரட்டை வரலாறு',
    delete: 'நீக்கு',
    deleteTitle: 'மதிப்பீட்டை நீக்கு',
    deleteDescription: 'இந்த மதிப்பீட்டை நீக்க விரும்புகிறீர்களா? இது மதிப்பீடு, அனைத்து சோதனை பதில்கள் மற்றும் அரட்டை வரலாற்றை நிரந்தரமாக நீக்கும். இந்த செயலை மீளமுடியாது.',
    deleteButton: 'நீக்கு',
    cancel: 'ரத்துசெய்',
    deleting: 'நீக்குகிறது...',
    at: 'அன்று'
  },
  bn: {
    title: 'মূল্যায়ন ইতিহাস',
    subtitle: 'আপনার সম্পূর্ণ মূল্যায়ন দেখুন',
    noAssessments: 'এখনও কোন মূল্যায়ন সম্পূর্ণ হয়নি',
    assessment: 'মূল্যায়ন',
    completedOn: 'সম্পূর্ণ হয়েছে',
    viewResponses: 'প্রতিক্রিয়া দেখুন',
    viewChatHistory: 'চ্যাট ইতিহাস',
    delete: 'মুছুন',
    deleteTitle: 'মূল্যায়ন মুছুন',
    deleteDescription: 'আপনি কি নিশ্চিত যে আপনি এই মূল্যায়নটি মুছতে চান? এটি মূল্যায়ন, সমস্ত পরীক্ষার প্রতিক্রিয়া এবং চ্যাট ইতিহাস স্থায়ীভাবে মুছে ফেলবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।',
    deleteButton: 'মুছুন',
    cancel: 'বাতিল',
    deleting: 'মুছে ফেলছে...',
    at: 'এ'
  },
  gu: {
    title: 'મૂલ્યાંકન ઇતિહાસ',
    subtitle: 'તમારા પૂર્ણ મૂલ્યાંકનો જુઓ',
    noAssessments: 'હજી સુધી કોઈ મૂલ્યાંકન પૂર્ણ થયું નથી',
    assessment: 'મૂલ્યાંકન',
    completedOn: 'પૂર્ણ થયું',
    viewResponses: 'પ્રતિસાદ જુઓ',
    viewChatHistory: 'ચેટ ઇતિહાસ',
    delete: 'કાઢી નાખો',
    deleteTitle: 'મૂલ્યાંકન કાઢી નાખો',
    deleteDescription: 'શું તમે ખરેખર આ મૂલ્યાંકન કાઢી નાખવા માંગો છો? આ મૂલ્યાંકન, બધી પરીક્ષણ પ્રતિસાદો અને ચેટ ઇતિહાસને કાયમી રીતે કાઢી નાખશે. આ ક્રિયાને પૂર્વવત્ કરી શકાતી નથી.',
    deleteButton: 'કાઢી નાખો',
    cancel: 'રદ કરો',
    deleting: 'કાઢી રહ્યા છીએ...',
    at: 'ના'
  }
};

interface AssessmentHistoryPageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  completedAssessments: CompletedAssessment[];
  navigateTo: (page: Page, displayResults?: boolean, assessmentId?: number) => void;
  onAssessmentDeleted?: (assessmentId: number) => void;
  onAssessmentsUpdated?: (assessments: CompletedAssessment[]) => void;
}

export function AssessmentHistoryPage({ 
  userProfile, 
  setUserProfile, 
  completedAssessments: propCompletedAssessments, 
  navigateTo,
  onAssessmentDeleted,
  onAssessmentsUpdated
}: AssessmentHistoryPageProps) {
  const t = translations[userProfile.language];
  const [completedAssessments, setCompletedAssessments] = useState<CompletedAssessment[]>(propCompletedAssessments);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh assessments when component mounts or when navigating to this page
  useEffect(() => {
    const refreshAssessments = async () => {
      setIsLoading(true);
      try {
        const response = await assessmentService.getHistory();
        const data = response.data;
        if (data.completed_assessments) {
          const testFlow: TestType[] = ['riasec', 'values', 'personal'];
          const assessments = data.completed_assessments
            .map((a: any) => ({
              id: a.id,
              completedAt: new Date(a.completed_at),
              tests: testFlow,
              has_chat: a.has_chat || false,
            }));
          // Sort: assessments with chat first, then by completed_at desc
          const sorted = assessments.sort((a: any, b: any) => {
            if (a.has_chat && !b.has_chat) return -1;
            if (!a.has_chat && b.has_chat) return 1;
            return b.completedAt.getTime() - a.completedAt.getTime();
          });
          setCompletedAssessments(sorted);
          // Notify parent component to update its state
          if (onAssessmentsUpdated) {
            onAssessmentsUpdated(sorted);
          }
        }
      } catch (error) {
        console.error('Error refreshing assessments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    refreshAssessments();
  }, []); // Only run on mount

  // Update local state when prop changes
  useEffect(() => {
    setCompletedAssessments(propCompletedAssessments);
  }, [propCompletedAssessments]);

  const handleLanguageChange = (lang: Language) => {
    setUserProfile({ ...userProfile, language: lang });
  };

  const handleDeleteClick = (assessmentId: number) => {
    setAssessmentToDelete(assessmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assessmentToDelete) return;

    setIsDeleting(true);
    try {
      // Delete assessment via API (this will cascade delete test responses and chat messages)
      await assessmentService.deleteAssessment(assessmentToDelete);
      
      // Refresh assessments from server
      const response = await assessmentService.getHistory();
      const data = response.data;
      if (data.completed_assessments) {
        const testFlow: TestType[] = ['aptitude', 'values', 'personal'];
        const assessments = data.completed_assessments
          .map((a: any) => ({
            id: a.id,
            completedAt: new Date(a.completed_at),
            tests: testFlow,
            has_chat: a.has_chat || false,
          }));
        // Sort: assessments with chat first, then by completed_at desc
        const sorted = assessments.sort((a: any, b: any) => {
          if (a.has_chat && !b.has_chat) return -1;
          if (!a.has_chat && b.has_chat) return 1;
          return b.completedAt.getTime() - a.completedAt.getTime();
        });
        setCompletedAssessments(sorted);
        // Notify parent component
        if (onAssessmentsUpdated) {
          onAssessmentsUpdated(sorted);
        }
        if (onAssessmentDeleted) {
          onAssessmentDeleted(assessmentToDelete);
        }
      }
      
      toast.success('Assessment deleted successfully');
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      toast.error(error.response?.data?.error || 'Failed to delete assessment');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(userProfile.language === 'en' ? 'en-US' : 'en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat(userProfile.language === 'en' ? 'en-US' : 'en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigateTo('home')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-gray-900">{t.title}</h2>
              <p className="text-gray-600 text-sm">{t.subtitle}</p>
            </div>
            <LanguageSelector 
              language={userProfile.language}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading assessments...</p>
            </CardContent>
          </Card>
        ) : completedAssessments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ClipboardList className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t.noAssessments}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedAssessments.map((assessment, index) => (
              <Card 
                key={assessment.id}
                className="border-2 hover:border-blue-300 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-xl">
                        <ClipboardList className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-gray-900">
                          {t.assessment} #{index + 1}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {t.completedOn} {formatDate(assessment.completedAt)} {t.at} {formatTime(assessment.completedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => navigateTo('chatbot', true, assessment.id)}
                        className="gap-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t.viewChatHistory}
                      </Button>
                      <Button
                        onClick={() => navigateTo('assessment-responses', false, assessment.id)}
                        variant="outline"
                        className="gap-2 w-full sm:w-auto"
                      >
                        <FileText className="h-4 w-4" />
                        {t.viewResponses}
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(assessment.id)}
                        variant="outline"
                        className="gap-2 w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t.delete}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Assessment Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteTitle}</DialogTitle>
            <DialogDescription>
              {t.deleteDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setAssessmentToDelete(null);
              }}
              disabled={isDeleting}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? t.deleting : t.deleteButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
