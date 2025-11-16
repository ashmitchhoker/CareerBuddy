import { useState, useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { SetupPage } from "./components/SetupPage";
import { LoginPage } from "./components/LoginPage";
import { HomePage } from "./components/HomePage";
import { ChatbotPage } from "./components/ChatbotPage";
import { TestFormPage } from "./components/TestFormPage";
import { ProcessingPage } from "./components/ProcessingPage";
import { AssessmentHistoryPage } from "./components/AssessmentHistoryPage";
import { AssessmentResponsesPage } from "./components/AssessmentResponsesPage";
import { SettingsPage } from "./components/SettingsPage";
import { authService } from "./services/authService";
import { assessmentService } from "./services/assessmentService";

export type Page =
  | "login"
  | "setup"
  | "home"
  | "chatbot"
  | "test-selection"
  | "test-form"
  | "processing"
  | "results"
  | "assessment-history"
  | "assessment-responses"
  | "settings";
export type TestType = "aptitude" | "values" | "personal";
export type Language = "en" | "hi" | "te" | "ta" | "bn" | "gu";

export interface CompletedAssessment {
  id: number;
  completedAt: Date;
  tests: TestType[];
  has_chat?: boolean; // Optional flag to indicate if assessment has chat messages
}

export interface SavedAssessment {
  testType: TestType;
  progress: number;
  answers: { [key: number]: string | string[] };
  currentQuestionIndex: number;
}

export interface AssessmentResults {
  recommendations: {
    title: string;
    confidence: number;
    reason: string;
    next_steps: string[];
  }[];
  summary: string;
  smsMessage?: string;
}

export interface UserProfile {
  name: string;
  class: string;
  age?: string;
  language: Language;
  email?: string;
  phone?: string;
  password?: string;
}

function App() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("login");
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [testFlow, setTestFlow] = useState<TestType[]>([
    "aptitude",
    "values",
    "personal",
  ]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [completedAssessments, setCompletedAssessments] = useState<
    CompletedAssessment[]
  >([]);
  const [showResults, setShowResults] = useState(false);
  const [savedAssessment, setSavedAssessment] =
    useState<SavedAssessment | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    number | null
  >(null);
  const [allTestAnswers, setAllTestAnswers] = useState<{
    [testType: string]: { [key: number]: string | string[] };
  }>({});
  const [assessmentResults, setAssessmentResults] =
    useState<AssessmentResults | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "<Student name>",
    class: "10th",
    language: "en",
  });
  const [loading, setLoading] = useState(true);

  // Function to load assessments - can be called from multiple places
  const loadAssessments = async () => {
    try {
      const historyResponse = await assessmentService.getHistory();
      const historyData = historyResponse.data;
      if (historyData.completed_assessments) {
        const assessments = historyData.completed_assessments
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
      }
    } catch (historyError) {
      console.error('Error loading assessment history:', historyError);
      // Fallback to home data if history fails
      try {
        const homeResponse = await assessmentService.getHome();
        const homeData = homeResponse.data;
        if (homeData.completed_assessments) {
          const assessments = homeData.completed_assessments
            .map((a: any) => ({
              id: a.id,
              completedAt: new Date(a.completed_at),
              tests: testFlow,
              has_chat: a.has_chat || false,
            }));
          const sorted = assessments.sort((a: any, b: any) => {
            if (a.has_chat && !b.has_chat) return -1;
            if (!a.has_chat && b.has_chat) return 1;
            return b.completedAt.getTime() - a.completedAt.getTime();
          });
          setCompletedAssessments(sorted);
        }
      } catch (homeError) {
        console.error('Error loading assessments from home:', homeError);
      }
    }
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for guest mode
        const guestMode = localStorage.getItem('pathfinder_guest_mode') === 'true';
        if (guestMode) {
          setIsGuestMode(true);
          setSetupComplete(true);
          setCurrentPage("home");
          setLoading(false);
          return;
        }

        if (authService.isAuthenticated()) {
          // Try to fetch home data to verify token
          const response = await assessmentService.getHome();
          const homeData = response.data;
          
          setUserProfile({
            name: homeData.user_profile.name || "<Student name>",
            class: homeData.user_profile.grade || "10th",
            age: homeData.user_profile.age?.toString(),
            language: "en", // Default, can be updated from user profile
            email: homeData.user_profile.email,
            phone: homeData.user_profile.phone,
          });

          // Load ALL completed assessments
          await loadAssessments();

          setSetupComplete(true);
          setCurrentPage("home");
        } else {
          setSetupComplete(false);
          setCurrentPage("login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Token invalid, clear and show login
        authService.logout();
        setSetupComplete(false);
        setCurrentPage("login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const currentTest = testFlow[currentTestIndex];

  const navigateTo = (
    page: Page,
    displayResults?: boolean,
    assessmentId?: number
  ) => {
    if (displayResults !== undefined) {
      setShowResults(displayResults);
    } else {
      setShowResults(false);
    }
    if (assessmentId !== undefined) {
      setSelectedAssessmentId(assessmentId);
    }
    setCurrentPage(page);
  };

  const startAssessmentFlow = async () => {
    try {
      // Clear previous assessment data before starting new one
      setAllTestAnswers({});
      setAssessmentResults(null);
      setShowResults(false);
      setSavedAssessment(null);
      
      // If in guest mode, use a temporary assessment ID
      if (isGuestMode) {
        setSelectedAssessmentId(Date.now());
        setCurrentTestIndex(0);
        navigateTo("test-form");
        return;
      }
      
      const response = await assessmentService.startAssessment();
      const data = response.data;
      setSelectedAssessmentId(data.assessment_id);
      setCurrentTestIndex(0);
      navigateTo("test-form");
    } catch (error) {
      console.error("Error starting assessment:", error);
      // If error and in guest mode, still allow to proceed
      if (isGuestMode) {
        setSelectedAssessmentId(Date.now());
        setCurrentTestIndex(0);
        navigateTo("test-form");
      }
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    localStorage.removeItem('pathfinder_guest_mode');
    setIsGuestMode(false);
    setSetupComplete(false);
    setCurrentPage("login");
    setCurrentTestIndex(0);
    setSavedAssessment(null);
    setShowResults(false);
    setSelectedAssessmentId(null);
    setCompletedAssessments([]);
  };

  const handleGuestMode = () => {
    setIsGuestMode(true);
    localStorage.setItem('pathfinder_guest_mode', 'true');
    setSetupComplete(true);
    setUserProfile({
      name: "Guest User",
      class: "10th",
      language: userProfile.language,
    });
    navigateTo("home");
  };

  const completeTest = (testType: TestType) => {
    // Move to next test or processing
    if (currentTestIndex < testFlow.length - 1) {
      setCurrentTestIndex(currentTestIndex + 1);
    } else {
      // All tests completed, create completed assessment
      const newAssessment: CompletedAssessment = {
        id: selectedAssessmentId || Date.now(),
        completedAt: new Date(),
        tests: testFlow,
      };
      setCompletedAssessments([...completedAssessments, newAssessment]);
      setSelectedAssessmentId(newAssessment.id);
      navigateTo("processing");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {currentPage === "login" && (
          <LoginPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            navigateTo={navigateTo}
            onLoginComplete={async () => {
              setIsGuestMode(false);
              localStorage.removeItem('pathfinder_guest_mode');
              setSetupComplete(true);
              // Load assessments after login
              await loadAssessments();
            }}
            onShowSignup={() => setCurrentPage("setup")}
            onGuestMode={handleGuestMode}
          />
        )}
        {currentPage === "setup" && (
          <SetupPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            navigateTo={navigateTo}
            onSetupComplete={() => setSetupComplete(true)}
          />
        )}
        {currentPage === "home" && (
          <HomePage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            navigateTo={navigateTo}
            savedAssessment={savedAssessment}
            completedAssessments={completedAssessments}
            startAssessmentFlow={startAssessmentFlow}
            onLogout={handleLogout}
            isGuestMode={isGuestMode}
          />
        )}
        {currentPage === "assessment-history" && (
          <AssessmentHistoryPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            completedAssessments={completedAssessments}
            navigateTo={navigateTo}
            onAssessmentDeleted={async (assessmentId) => {
              // Remove from local state
              setCompletedAssessments(prev => 
                prev.filter(a => a.id !== assessmentId)
              );
            }}
            onAssessmentsUpdated={(assessments) => {
              // Update parent state when assessments are refreshed
              setCompletedAssessments(assessments);
            }}
          />
        )}
        {currentPage === "assessment-responses" && selectedAssessmentId && (
          <AssessmentResponsesPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            navigateTo={navigateTo}
            assessmentId={selectedAssessmentId}
          />
        )}
        {currentPage === "chatbot" && (
          <ChatbotPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            navigateTo={navigateTo}
            showResults={showResults}
            assessmentResults={assessmentResults}
            assessmentId={selectedAssessmentId}
          />
        )}
        {currentPage === "test-form" && (
          <TestFormPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            testType={currentTest}
            navigateTo={navigateTo}
            savedAssessment={savedAssessment}
            setSavedAssessment={setSavedAssessment}
            completeTest={completeTest}
            currentTestIndex={currentTestIndex}
            totalTests={testFlow.length}
            onTestComplete={(testType, answers) => {
              setAllTestAnswers((prev) => ({ ...prev, [testType]: answers }));
            }}
          />
        )}
        {currentPage === "processing" && (
          <ProcessingPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            navigateTo={navigateTo}
            selectedTest={testFlow[testFlow.length - 1]}
            allTestAnswers={allTestAnswers}
            testFlow={testFlow}
            assessmentId={selectedAssessmentId}
            onResultsReceived={async (results) => {
              setAssessmentResults(results);
              // Refresh assessments list after completing assessment
              await loadAssessments();
            }}
          />
        )}
        {currentPage === "settings" && (
          <SettingsPage
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            navigateTo={navigateTo}
          />
        )}
      </div>
    </>
  );
}

export default App;

