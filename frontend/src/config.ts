// Backend API configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export const API_ENDPOINTS = {
  ASSESSMENT_COMPLETE: `${API_BASE_URL}/assessment/complete`,
  CHAT_START: `${API_BASE_URL}/chat/start`,
  CHAT_MESSAGE: `${API_BASE_URL}/chat/message`,
};

