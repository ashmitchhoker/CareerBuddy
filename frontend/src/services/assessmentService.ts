// src/services/assessmentService.ts
import apiClient from './api';

export const assessmentService = {
  // Home/Dashboard
  getHome: () => apiClient.get('/home'),
  
  // Assessment
  startAssessment: () => apiClient.post('/assessment/start'),
  
  getTestData: (testType: string, assessmentId?: number) => {
    const params = assessmentId ? `?assessmentId=${assessmentId}` : '';
    return apiClient.get(`/assessment/test/${testType}${params}`);
  },
  
  saveProgress: (data: {
    test_response_id: number;
    answers: { [key: number]: string | string[] };
    current_question_index: number;
  }) => apiClient.post('/assessment/save', data),
  
  submitTest: (data: {
    test_response_id: number;
    answers: { [key: number]: string | string[] };
  }) => apiClient.post('/assessment/submit', data),
  
  completeAssessment: (data: {
    userProfile: any;
    tests: Array<{ type: string; answers: any }>;
    completedAt: string;
    assessmentId: number;
  }) => apiClient.post('/assessment/complete', data),
  
  getHistory: () => apiClient.get('/assessment/history'),
  
  deleteAssessment: (assessmentId: number) =>
    apiClient.delete(`/assessment/${assessmentId}`),
  
  getResponses: (assessmentId: number) =>
    apiClient.get(`/assessment/${assessmentId}/responses`),
  
  // Chatbot
  startChat: (data: {
    sessionId: string;
    assessmentId?: number;
    assessmentSummary?: string;
    language?: string;
  }) => apiClient.post('/chat/start', data),
  
  sendChatMessage: (data: {
    sessionId: string;
    message: string;
    language?: string;
    assessmentId?: number;
  }) => apiClient.post('/chat/message', data),
  
  getChatHistory: (assessmentId?: number) => {
    const params = assessmentId ? `?assessment_id=${assessmentId}` : '';
    return apiClient.get(`/chat/history${params}`);
  },
  
  deleteChatHistory: (assessmentId?: number) => {
    const params = assessmentId ? `?assessment_id=${assessmentId}` : '';
    return apiClient.delete(`/chat/history${params}`);
  },
  
  // Profile
  getProfile: () => apiClient.get('/profile'),
  
  updateProfile: (profileData: any) => apiClient.patch('/profile/update', profileData),
  
  deleteAccount: () => apiClient.delete('/profile/delete'),
};

