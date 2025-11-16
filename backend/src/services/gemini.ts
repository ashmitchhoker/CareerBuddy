import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  Language,
  AssessmentPayload,
  CareerRecommendation,
  AssessmentResponse,
  ChatMessage,
} from "../types";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || MAX_RETRIES;
  const initialDelay = options.initialDelay || INITIAL_RETRY_DELAY;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429) or quota error
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.toLowerCase().includes("quota") ||
        error?.message?.toLowerCase().includes("rate limit");

      if (!isRateLimit || attempt === maxAttempts - 1) {
        throw error;
      }

      // Exponential backoff: delay = initialDelay * 2^attempt
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(
        `Rate limit hit, retrying in ${delay}ms (attempt ${
          attempt + 1
        }/${maxAttempts})`
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;
  private readonly modelId = "gemini-2.5-pro";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getSystemPrompt(
    language: Language,
    context: "recommendation" | "chat"
  ): string {
    const languageNames: Record<Language, string> = {
      en: "English",
      hi: "Hindi",
      te: "Telugu",
      ta: "Tamil",
      bn: "Bengali",
      gu: "Gujarati",
    };

    const basePrompt = `You are a friendly, encouraging career counsellor for students aged 13-15. 
Respond in ${languageNames[language]} (${language}).

Safety rules:
- Do not ask for highly-sensitive personal data (financial, medical). 
- If such data is received, respond with a gentle refusal and redirect to guardian/teacher.
- Keep responses age-appropriate and encouraging.
- Focus on career guidance and educational paths.`;

    if (context === "recommendation") {
      return `${basePrompt}

Your task: Analyze the student's assessment responses and generate personalized career recommendations.
Return ONLY a valid JSON object with this exact structure:
{
  "recommendations": [
    {
      "title": "Career Name",
      "confidence": 0.85,
      "reason": "Brief explanation why this fits",
      "next_steps": ["Step 1", "Step 2"]
    }
  ],
  "summary": "A short, friendly 1-2 sentence summary for the student"
}

Provide 3-4 career recommendations based on their strengths, interests, and values.`;
    } else {
      return `${basePrompt}

You are chatting with a student who has completed a career assessment. 
Use the assessment summary as context for your responses.
Be conversational, friendly, and helpful. Keep responses concise (2-3 sentences max).
Return a JSON object: {"reply": "your response", "intent": "follow_up" or "question" or "clarification"}`;
    }
  }

  private formatFallbackGreeting(
    assessmentSummary: string,
    language: Language
  ): { reply: string; intent: string } {
    // Parse assessment summary to extract student name and recommendations
    const studentNameMatch = assessmentSummary.match(/Student:\s*([^(]+)/);
    const studentName = studentNameMatch
      ? studentNameMatch[1].trim()
      : "Student";

    // Extract recommendations (format: "1. Title (XX% match) - reason. Next steps: ...")
    const recommendationsMatch = assessmentSummary.match(
      /Recommendations:\s*([\s\S]+)/
    );
    const recommendationsText = recommendationsMatch
      ? recommendationsMatch[1].trim()
      : "";

    // Parse each recommendation
    const recommendationLines = recommendationsText
      .split("\n")
      .filter((line) => line.trim().match(/^\d+\./))
      .slice(0, 4); // Take up to 4 recommendations

    const recommendations = recommendationLines.map((line) => {
      // Extract title (between number and percentage)
      const titleMatch = line.match(/\d+\.\s*([^(]+)\s*\(/);
      const title = titleMatch ? titleMatch[1].trim() : "";

      // Extract percentage
      const percentMatch = line.match(/\((\d+)%/);
      const percent = percentMatch ? percentMatch[1] : "";

      // Extract reason and next steps
      // Format: "Title (XX% match) - reason. Next steps: step1, step2" or "Title (XX% match) - reason"
      let reason = "";
      let steps: string[] = [];

      // Get everything after the closing parenthesis and dash
      const afterDashMatch = line.match(/\)\s*-\s*(.+)$/);
      if (afterDashMatch) {
        const afterDash = afterDashMatch[1];

        // Check if "Next steps:" exists
        if (afterDash.includes(". Next steps:")) {
          // Split on ". Next steps:" - everything before is reason, after is steps
          const parts = afterDash.split(/\.\s*Next steps:\s*/);
          reason = parts[0] ? parts[0].trim() : "";
          if (parts[1]) {
            steps = parts[1]
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
          }
        } else {
          // No next steps, everything is the reason
          reason = afterDash.trim().replace(/\.$/, "");
        }
      }

      return { title, percent, reason, steps };
    });

    // Format the response based on language
    const greetings: Record<Language, string> = {
      en: `Hey ${studentName}, great job on the assessment! Based on your results, here are some exciting career paths for you:\n\n`,
      hi: `${studentName}, मूल्यांकन पूरा करने के लिए बधाई! आपके परिणामों के आधार पर, यहाँ कुछ रोमांचक करियर पथ हैं:\n\n`,
      te: `${studentName}, అసెస్‌మెంట్ పూర్తి చేసినందుకు అభినందనలు! మీ ఫలితాల ఆధారంగా, మీ కోసం కొన్ని ఉత్తేజకరమైన కెరీర్ మార్గాలు ఇక్కడ ఉన్నాయి:\n\n`,
      ta: `${studentName}, மதிப்பீட்டை முடித்ததற்கு வாழ்த்துக்கள்! உங்கள் முடிவுகளின் அடிப்படையில், உங்களுக்கான சில சுவாரஸ்யமான தொழில் பாதைகள் இங்கே:\n\n`,
      bn: `${studentName}, মূল্যায়ন সম্পন্ন করার জন্য অভিনন্দন! আপনার ফলাফলের ভিত্তিতে, এখানে কিছু উত্তেজনাপূর্ণ ক্যারিয়ার পথ রয়েছে:\n\n`,
      gu: `${studentName}, મૂલ્યાંકન પૂર્ણ કરવા માટે અભિનંદન! તમારા પરિણામોના આધારે, અહીં કેટલાક રોમાંચક કારકિર્દી માર્ગો છે:\n\n`,
    };

    const nextStepsLabels: Record<Language, string> = {
      en: "Next steps",
      hi: "अगले कदम",
      te: "తదుపరి దశలు",
      ta: "அடுத்த படிகள்",
      bn: "পরবর্তী পদক্ষেপ",
      gu: "આગળના પગલાં",
    };

    const closingMessages: Record<Language, string> = {
      en: "\n\nFeel free to ask me any questions about these career paths!",
      hi: "\n\nइन करियर पथों के बारे में कोई भी प्रश्न पूछने के लिए स्वतंत्र महसूस करें!",
      te: "\n\nఈ కెరీర్ మార్గాల గురించి ఏవైనా ప్రశ్నలు అడగడానికి సంకోచించకండి!",
      ta: "\n\nஇந்த தொழில் பாதைகள் பற்றி எந்த கேள்விகளையும் கேட்க தயங்க வேண்டாம்!",
      bn: "\n\nএই ক্যারিয়ার পথ সম্পর্কে কোন প্রশ্ন করতে নির্দ্বিধায় জিজ্ঞাসা করুন!",
      gu: "\n\nઆ કારકિર્દી માર્ગો વિશે કોઈપણ પ્રશ્નો પૂછવા માટે મફત લાગે!",
    };

    let reply = greetings[language] || greetings.en;

    recommendations.forEach((rec, idx) => {
      if (rec.title) {
        reply += `<strong>${rec.title}</strong>`;
        if (rec.percent) {
          reply += ` (${rec.percent}% match)`;
        }
        reply += "\n";
        if (rec.reason) {
          reply += `${rec.reason}\n`;
        }
        if (rec.steps.length > 0) {
          reply += `${nextStepsLabels[language] || nextStepsLabels.en}: `;
          reply += rec.steps.slice(0, 3).join(" • ") + "\n";
        }
        if (idx < recommendations.length - 1) {
          reply += "\n";
        }
      }
    });

    reply += closingMessages[language] || closingMessages.en;

    return { reply, intent: "follow_up" };
  }

  async generateInitialGreeting(
    assessmentSummary: string,
    language: Language
  ): Promise<{ reply: string; intent: string }> {
    const systemPrompt = this.getSystemPrompt(language, "chat");
    const prompt = `${systemPrompt}

This is the FIRST message after the assessment is complete.
Assessment summary:
${assessmentSummary}

Instruction:
- Greet the student by name if provided in the summary.
- Present 3-4 career paths from the recommendations in a structured format.
- Format each career path clearly with:
  * Career name (use **bold** or similar emphasis)
  * Brief reason why it fits (1 sentence)
  * Key next steps (2-3 bullet points or short phrases)
- Use clear formatting with line breaks between each career path.
- Keep the overall message concise but informative.
- End with encouragement to ask follow-up questions.
Respond with JSON {"reply":"...", "intent":"follow_up"}.`;

    try {
      const response = await retryWithBackoff(async () => {
        const model = this.genAI.getGenerativeModel({ model: this.modelId });
        const result = await model.generateContent(prompt);
        return result.response.text();
      });

      return this.parseChatResponse(response, language);
    } catch (error) {
      console.error("Error generating initial greeting:", error);
      // Use formatted fallback that parses assessment summary
      return this.formatFallbackGreeting(assessmentSummary, language);
    }
  }

  async generateRecommendations(
    assessment: AssessmentPayload,
    retryOptions?: RetryOptions
  ): Promise<AssessmentResponse> {
    const prompt = this.buildRecommendationPrompt(assessment);

    try {
      const response = await retryWithBackoff(async () => {
        const model = this.genAI.getGenerativeModel({ model: this.modelId });
        const result = await model.generateContent(prompt);
        return result.response.text();
      }, retryOptions);

      return this.parseRecommendationResponse(
        response,
        assessment.userProfile.language
      );
    } catch (error: any) {
      console.error("Error generating recommendations:", error);

      // Fallback to personalized response based on assessment data
      return this.getFallbackRecommendations(assessment);
    }
  }

  private buildRecommendationPrompt(assessment: AssessmentPayload): string {
    const lang = assessment.userProfile.language;
    const systemPrompt = this.getSystemPrompt(lang, "recommendation");

    // Build assessment summary
    let assessmentSummary = `Student: ${assessment.userProfile.name}, Class: ${assessment.userProfile.class}`;
    if (assessment.userProfile.age) {
      assessmentSummary += `, Age: ${assessment.userProfile.age}`;
    }
    assessmentSummary += `\n\nAssessment Results:\n`;

    assessment.tests.forEach((test) => {
      assessmentSummary += `\n${test.type.toUpperCase()} Test:\n`;
      Object.entries(test.answers).forEach(([qId, answer]) => {
        const answerStr = Array.isArray(answer) ? answer.join(", ") : answer;
        assessmentSummary += `Q${qId}: ${answerStr}\n`;
      });
    });

    return `${systemPrompt}\n\n${assessmentSummary}\n\nGenerate recommendations now:`;
  }

  private parseRecommendationResponse(
    response: string,
    language: Language
  ): AssessmentResponse {
    try {
      // Try to extract JSON from response (might have markdown code blocks)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error("Invalid response structure");
      }

      // Generate SMS message
      const smsMessage = this.generateSMSMessage(parsed, language);

      return {
        recommendations: parsed.recommendations,
        summary:
          parsed.summary ||
          "Based on your assessment, we have some great career paths for you!",
        smsMessage,
      };
    } catch (error) {
      console.error("Failed to parse recommendation response:", error);
      throw new Error("Invalid response format from AI");
    }
  }

  private generateSMSMessage(data: any, language: Language): string {
    const lang = language;
    const recommendations = data.recommendations || [];

    if (lang === "en") {
      let sms = `Hi! Your career recommendations: `;
      recommendations
        .slice(0, 2)
        .forEach((rec: CareerRecommendation, idx: number) => {
          sms += `${idx + 1}. ${rec.title} `;
        });
      sms += `- ${data.summary || "Explore these paths!"}`;
      return sms.substring(0, 160); // SMS length limit
    }

    // For other languages, keep it simple
    return data.summary || "Your career recommendations are ready!";
  }

  private getFallbackRecommendations(
    assessment: AssessmentPayload
  ): AssessmentResponse {
    const language = assessment.userProfile.language;

    // Analyze assessment answers to provide personalized recommendations
    const analysis = this.analyzeAssessment(assessment);

    // Generate recommendations based on analysis
    return this.generatePersonalizedFallback(analysis, language);
  }

  private analyzeAssessment(assessment: AssessmentPayload): {
    techInterest: number;
    analyticalStrength: number;
    creativeInterest: number;
    socialInterest: number;
    businessInterest: number;
    preferredSubjects: string[];
    careerInterest?: string;
  } {
    let techInterest = 0;
    let analyticalStrength = 0;
    let creativeInterest = 0;
    let socialInterest = 0;
    let businessInterest = 0;
    const preferredSubjects: string[] = [];
    let careerInterest: string | undefined;

    // Analyze each test
    assessment.tests.forEach((test) => {
      if (test.type === "aptitude") {
        // Analyze aptitude answers
        Object.values(test.answers).forEach((answer) => {
          const answerStr = Array.isArray(answer)
            ? answer.join(" ")
            : String(answer).toLowerCase();

          // Tech/analytical indicators
          if (
            answerStr.includes("agree") ||
            answerStr.includes("strongly agree")
          ) {
            // Questions about numbers, logic, problem-solving suggest tech/analytical
            techInterest += 0.1;
            analyticalStrength += 0.1;
          }

          // Creative indicators
          if (
            answerStr.includes("disagree") &&
            answerStr.includes("creative")
          ) {
            creativeInterest -= 0.1;
          } else if (
            answerStr.includes("agree") &&
            answerStr.includes("creative")
          ) {
            creativeInterest += 0.1;
          }

          // Social indicators
          if (
            answerStr.includes("group") ||
            answerStr.includes("discussion") ||
            answerStr.includes("speak")
          ) {
            if (answerStr.includes("agree")) {
              socialInterest += 0.15;
            }
          }
        });
      } else if (test.type === "values") {
        // Analyze values - look for business, stability, impact indicators
        Object.values(test.answers).forEach((answer) => {
          const answerStr = Array.isArray(answer)
            ? answer.join(" ")
            : String(answer).toLowerCase();

          if (
            answerStr.includes("salary") ||
            answerStr.includes("stable") ||
            answerStr.includes("benefits")
          ) {
            if (answerStr.includes("agree")) {
              businessInterest += 0.1;
            }
          }

          if (
            answerStr.includes("community") ||
            answerStr.includes("society") ||
            answerStr.includes("impact")
          ) {
            if (answerStr.includes("agree")) {
              socialInterest += 0.1;
            }
          }
        });
      } else if (test.type === "personal") {
        // Extract personal preferences
        Object.entries(test.answers).forEach(([qId, answer]) => {
          if (qId === "53") {
            // Preferred subjects
            if (Array.isArray(answer)) {
              preferredSubjects.push(...answer);
            }
          } else if (qId === "54") {
            // Career interest
            if (typeof answer === "string" && answer.trim().length > 0) {
              careerInterest = answer;
            }
          }
        });
      }
    });

    // Normalize scores (0-1 range)
    const normalize = (val: number, max: number) => Math.min(1, val / max);

    return {
      techInterest: normalize(techInterest, 1.5),
      analyticalStrength: normalize(analyticalStrength, 1.5),
      creativeInterest: normalize(creativeInterest, 1.0),
      socialInterest: normalize(socialInterest, 1.5),
      businessInterest: normalize(businessInterest, 1.0),
      preferredSubjects,
      careerInterest,
    };
  }

  private generatePersonalizedFallback(
    analysis: {
      techInterest: number;
      analyticalStrength: number;
      creativeInterest: number;
      socialInterest: number;
      businessInterest: number;
      preferredSubjects: string[];
      careerInterest?: string;
    },
    language: Language
  ): AssessmentResponse {
    // Define career options with scoring weights
    const careerOptions = [
      {
        title: {
          en: "Software Developer",
          hi: "सॉफ्टवेयर डेवलपर",
          te: "సాఫ్ట్‌వేర్ డెవలపర్",
          ta: "மென்பொருள் உருவாக்குநர்",
          bn: "সফটওয়্যার ডেভেলপার",
          gu: "સોફ્ટવેર ડેવલપર",
        },
        score: analysis.techInterest * 0.6 + analysis.analyticalStrength * 0.4,
        reason: {
          en: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("computer") ||
                  s.toLowerCase().includes("coding")
              )
            ) {
              return "Your interest in computer science and technology makes software development a great fit";
            }
            return "Your analytical thinking and problem-solving skills align well with software development";
          },
          hi: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("computer") ||
                  s.toLowerCase().includes("coding")
              )
            ) {
              return "कंप्यूटर विज्ञान और प्रौद्योगिकी में आपकी रुचि सॉफ्टवेयर विकास को एक बेहतरीन विकल्प बनाती है";
            }
            return "आपकी विश्लेषणात्मक सोच और समस्या-समाधान कौशल सॉफ्टवेयर विकास के साथ अच्छी तरह से मेल खाते हैं";
          },
          te: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("computer") ||
                  s.toLowerCase().includes("coding")
              )
            ) {
              return "కంప్యూటర్ సైన్స్ మరియు టెక్నాలజీలో మీ ఆసక్తి సాఫ్ట్‌వేర్ డెవలప్‌మెంట్‌ను గొప్ప ఎంపికగా చేస్తుంది";
            }
            return "మీ విశ్లేషణాత్మక ఆలోచన మరియు సమస్య-పరిష్కార నైపుణ్యాలు సాఫ్ట్‌వేర్ డెవలప్‌మెంట్‌తో బాగా సరిపోతాయి";
          },
          ta: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("computer") ||
                  s.toLowerCase().includes("coding")
              )
            ) {
              return "கணினி அறிவியல் மற்றும் தொழில்நுட்பத்தில் உங்கள் ஆர்வம் மென்பொருள் உருவாக்கத்தை சிறந்த தேர்வாக்குகிறது";
            }
            return "உங்கள் பகுப்பாய்வு சிந்தனை மற்றும் சிக்கல் தீர்ப்பு திறன்கள் மென்பொருள் உருவாக்கத்துடன் நன்றாக பொருந்துகின்றன";
          },
          bn: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("computer") ||
                  s.toLowerCase().includes("coding")
              )
            ) {
              return "কম্পিউটার বিজ্ঞান এবং প্রযুক্তিতে আপনার আগ্রহ সফটওয়্যার ডেভেলপমেন্টকে একটি দুর্দান্ত পছন্দ করে তোলে";
            }
            return "আপনার বিশ্লেষণাত্মক চিন্তাভাবনা এবং সমস্যা সমাধানের দক্ষতা সফটওয়্যার ডেভেলপমেন্টের সাথে ভালভাবে মিলে যায়";
          },
          gu: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("computer") ||
                  s.toLowerCase().includes("coding")
              )
            ) {
              return "કમ્પ્યુટર સાયન્સ અને ટેક્નોલોજીમાં તમારી રુચિ સોફ્ટવેર ડેવલપમેન્ટને એક મહાન પસંદગી બનાવે છે";
            }
            return "તમારી વિશ્લેષણાત્મક વિચારસરણી અને સમસ્યા-ઉકેલ કુશળતા સોફ્ટવેર ડેવલપમેન્ટ સાથે સારી રીતે મેળ ખાય છે";
          },
        },
        nextSteps: {
          en: [
            "Learn programming basics (Python or JavaScript)",
            "Build small projects",
            "Take computer science courses",
          ],
          hi: [
            "प्रोग्रामिंग की मूल बातें सीखें (Python या JavaScript)",
            "छोटी परियोजनाएं बनाएं",
            "कंप्यूटर विज्ञान पाठ्यक्रम लें",
          ],
          te: [
            "ప్రోగ్రామింగ్ ప్రాథమికాలు నేర్చుకోండి (Python లేదా JavaScript)",
            "చిన్న ప్రాజెక్ట్‌లను నిర్మించండి",
            "కంప్యూటర్ సైన్స్ కోర్సులు తీసుకోండి",
          ],
          ta: [
            "நிரலாக்க அடிப்படைகளைக் கற்றுக்கொள்ளுங்கள் (Python அல்லது JavaScript)",
            "சிறிய திட்டங்களை உருவாக்குங்கள்",
            "கணினி அறிவியல் படிப்புகளை எடுத்துக்கொள்ளுங்கள்",
          ],
          bn: [
            "প্রোগ্রামিং বেসিক শিখুন (Python বা JavaScript)",
            "ছোট প্রজেক্ট তৈরি করুন",
            "কম্পিউটার সায়েন্স কোর্স নিন",
          ],
          gu: [
            "પ્રોગ્રામિંગ મૂળભૂત જાણો (Python અથવા JavaScript)",
            "નાના પ્રોજેક્ટ બનાવો",
            "કમ્પ્યુટર સાયન્સ કોર્સ લો",
          ],
        },
      },
      {
        title: {
          en: "Data Analyst",
          hi: "डेटा विश्लेषक",
          te: "డేటా విశ్లేషకుడు",
          ta: "தரவு பகுப்பாய்வாளர்",
          bn: "ডেটা অ্যানালিস্ট",
          gu: "ડેટા એનાલિસ્ટ",
        },
        score: analysis.analyticalStrength * 0.7 + analysis.techInterest * 0.3,
        reason: {
          en: () =>
            "Your strong analytical skills and attention to detail make data analysis a great fit",
          hi: () =>
            "आपके मजबूत विश्लेषणात्मक कौशल और विवरण पर ध्यान डेटा विश्लेषण को एक बेहतरीन विकल्प बनाते हैं",
          te: () =>
            "మీ బలమైన విశ్లేషణాత్మక నైపుణ్యాలు మరియు వివరాలపై శ్రద్ధ డేటా విశ్లేషణను గొప్ప ఎంపికగా చేస్తాయి",
          ta: () =>
            "உங்கள் வலுவான பகுப்பாய்வு திறன்கள் மற்றும் விவரங்களில் கவனம் தரவு பகுப்பாய்வை சிறந்த தேர்வாக்குகிறது",
          bn: () =>
            "আপনার শক্তিশালী বিশ্লেষণাত্মক দক্ষতা এবং বিস্তারিত বিবরণে মনোযোগ ডেটা অ্যানালাইসিসকে একটি দুর্দান্ত পছন্দ করে তোলে",
          gu: () =>
            "તમારી મજબૂત વિશ્લેષણાત્મક કુશળતા અને વિગતો પર ધ્યાન ડેટા વિશ્લેષણને એક મહાન પસંદગી બનાવે છે",
        } as Record<Language, (subjects?: string[]) => string>,
        nextSteps: {
          en: [
            "Learn statistics and data visualization",
            "Practice with Excel and data tools",
            "Explore data science courses",
          ],
          hi: [
            "सांख्यिकी और डेटा विज़ुअलाइज़ेशन सीखें",
            "Excel और डेटा टूल्स के साथ अभ्यास करें",
            "डेटा साइंस पाठ्यक्रमों का अन्वेषण करें",
          ],
          te: [
            "గణాంకాలు మరియు డేటా విజువలైజేషన్ నేర్చుకోండి",
            "Excel మరియు డేటా టూల్స్‌తో ప్రాక్టీస్ చేయండి",
            "డేటా సైన్స్ కోర్సులను అన్వేషించండి",
          ],
          ta: [
            "புள்ளிவிவரங்கள் மற்றும் தரவு காட்சிப்படுத்தலைக் கற்றுக்கொள்ளுங்கள்",
            "Excel மற்றும் தரவு கருவிகளுடன் பயிற்சி செய்யுங்கள்",
            "தரவு அறிவியல் படிப்புகளை ஆராயுங்கள்",
          ],
          bn: [
            "পরিসংখ্যান এবং ডেটা ভিজ্যুয়ালাইজেশন শিখুন",
            "Excel এবং ডেটা টুলস দিয়ে অনুশীলন করুন",
            "ডেটা সায়েন্স কোর্স অন্বেষণ করুন",
          ],
          gu: [
            "આંકડાશાસ્ત્ર અને ડેટા વિઝ્યુઅલાઇઝેશન શીખો",
            "Excel અને ડેટા ટૂલ્સ સાથે પ્રેક્ટિસ કરો",
            "ડેટા સાયન્સ કોર્સ અન્વેષણ કરો",
          ],
        },
      },
      {
        title: {
          en: "Engineering",
          hi: "इंजीनियरिंग",
          te: "ఇంజనీరింగ్",
          ta: "பொறியியல்",
          bn: "ইঞ্জিনিয়ারিং",
          gu: "એન્જિનિયરિંગ",
        },
        score:
          analysis.analyticalStrength * 0.5 +
          (analysis.preferredSubjects.some(
            (s) =>
              s.toLowerCase().includes("math") ||
              s.toLowerCase().includes("science")
          )
            ? 0.3
            : 0) +
          0.2,
        reason: {
          en: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("math") ||
                  s.toLowerCase().includes("science")
              )
            ) {
              return "Your strong foundation in math and science subjects makes engineering a natural fit";
            }
            return "Your analytical thinking and problem-solving approach align well with engineering";
          },
          hi: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("math") ||
                  s.toLowerCase().includes("science")
              )
            ) {
              return "गणित और विज्ञान विषयों में आपकी मजबूत नींव इंजीनियरिंग को एक प्राकृतिक फिट बनाती है";
            }
            return "आपकी विश्लेषणात्मक सोच और समस्या-समाधान दृष्टिकोण इंजीनियरिंग के साथ अच्छी तरह से मेल खाता है";
          },
          te: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("math") ||
                  s.toLowerCase().includes("science")
              )
            ) {
              return "గణితం మరియు సైన్స్ విషయాలలో మీ బలమైన పునాది ఇంజనీరింగ్‌ను సహజమైన ఎంపికగా చేస్తుంది";
            }
            return "మీ విశ్లేషణాత్మక ఆలోచన మరియు సమస్య-పరిష్కార విధానం ఇంజనీరింగ్‌తో బాగా సరిపోతుంది";
          },
          ta: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("math") ||
                  s.toLowerCase().includes("science")
              )
            ) {
              return "கணிதம் மற்றும் அறிவியல் பாடங்களில் உங்கள் வலுவான அடித்தளம் பொறியியலை இயற்கையான பொருத்தமாக்குகிறது";
            }
            return "உங்கள் பகுப்பாய்வு சிந்தனை மற்றும் சிக்கல் தீர்ப்பு அணுகுமுறை பொறியியலுடன் நன்றாக பொருந்துகிறது";
          },
          bn: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("math") ||
                  s.toLowerCase().includes("science")
              )
            ) {
              return "গণিত এবং বিজ্ঞান বিষয়ে আপনার শক্তিশালী ভিত্তি ইঞ্জিনিয়ারিংকে একটি প্রাকৃতিক ফিট করে তোলে";
            }
            return "আপনার বিশ্লেষণাত্মক চিন্তাভাবনা এবং সমস্যা সমাধানের পদ্ধতি ইঞ্জিনিয়ারিংয়ের সাথে ভালভাবে মিলে যায়";
          },
          gu: (subjects: string[]) => {
            if (
              subjects.some(
                (s) =>
                  s.toLowerCase().includes("math") ||
                  s.toLowerCase().includes("science")
              )
            ) {
              return "ગણિત અને વિજ્ઞાન વિષયોમાં તમારી મજબૂત પાયો એન્જિનિયરિંગને કુદરતી ફિટ બનાવે છે";
            }
            return "તમારી વિશ્લેષણાત્મક વિચારસરણી અને સમસ્યા-ઉકેલ અભિગમ એન્જિનિયરિંગ સાથે સારી રીતે મેળ ખાય છે";
          },
        },
        nextSteps: {
          en: [
            "Focus on math and science subjects",
            "Join engineering clubs or competitions",
            "Research different engineering disciplines",
          ],
          hi: [
            "गणित और विज्ञान विषयों पर ध्यान दें",
            "इंजीनियरिंग क्लब या प्रतियोगिताओं में शामिल हों",
            "विभिन्न इंजीनियरिंग विषयों पर शोध करें",
          ],
          te: [
            "గణితం మరియు సైన్స్ విషయాలపై దృష్టి పెట్టండి",
            "ఇంజనీరింగ్ క్లబ్‌లు లేదా పోటీలలో చేరండి",
            "వివిధ ఇంజనీరింగ్ విభాగాలపై పరిశోధన చేయండి",
          ],
          ta: [
            "கணிதம் மற்றும் அறிவியல் பாடங்களில் கவனம் செலுத்துங்கள்",
            "பொறியியல் கழகங்கள் அல்லது போட்டிகளில் சேரவும்",
            "வெவ்வேறு பொறியியல் துறைகளை ஆராயுங்கள்",
          ],
          bn: [
            "গণিত এবং বিজ্ঞান বিষয়ে ফোকাস করুন",
            "ইঞ্জিনিয়ারিং ক্লাব বা প্রতিযোগিতায় যোগ দিন",
            "বিভিন্ন ইঞ্জিনিয়ারিং শাখা নিয়ে গবেষণা করুন",
          ],
          gu: [
            "ગણિત અને વિજ્ઞાન વિષયો પર ધ્યાન કેન્દ્રિત કરો",
            "એન્જિનિયરિંગ ક્લબ અથવા સ્પર્ધાઓમાં જોડાઓ",
            "વિવિધ એન્જિનિયરિંગ શાખાઓ પર સંશોધન કરો",
          ],
        },
      },
      {
        title: {
          en: "Business & Management",
          hi: "व्यवसाय और प्रबंधन",
          te: "వ్యాపారం మరియు నిర్వహణ",
          ta: "வணிகம் மற்றும் மேலாண்மை",
          bn: "ব্যবসা ও ব্যবস্থাপনা",
          gu: "વ્યવસાય અને વ્યવસ્થાપન",
        },
        score: analysis.businessInterest * 0.6 + analysis.socialInterest * 0.4,
        reason: {
          en: () =>
            "Your interest in leadership and strategic thinking makes business and management a great fit",
          hi: () =>
            "नेतृत्व और रणनीतिक सोच में आपकी रुचि व्यवसाय और प्रबंधन को एक बेहतरीन विकल्प बनाती है",
          te: () =>
            "నాయకత్వం మరియు వ్యూహాత్మక ఆలోచనలో మీ ఆసక్తి వ్యాపారం మరియు నిర్వహణను గొప్ప ఎంపికగా చేస్తుంది",
          ta: () =>
            "தலைமைத்துவம் மற்றும் உத்தியியல் சிந்தனையில் உங்கள் ஆர்வம் வணிகம் மற்றும் மேலாண்மையை சிறந்த தேர்வாக்குகிறது",
          bn: () =>
            "নেতৃত্ব এবং কৌশলগত চিন্তাভাবনায় আপনার আগ্রহ ব্যবসা ও ব্যবস্থাপনাকে একটি দুর্দান্ত পছন্দ করে তোলে",
          gu: () =>
            "નેતૃત્વ અને વ્યૂહાત્મક વિચારસરણીમાં તમારી રુચિ વ્યવસાય અને વ્યવસ્થાપનને એક મહાન પસંદગી બનાવે છે",
        } as Record<Language, (subjects?: string[]) => string>,
        nextSteps: {
          en: [
            "Learn about economics and finance",
            "Join business clubs or competitions",
            "Develop communication and teamwork skills",
          ],
          hi: [
            "अर्थशास्त्र और वित्त के बारे में जानें",
            "व्यवसाय क्लब या प्रतियोगिताओं में शामिल हों",
            "संचार और टीमवर्क कौशल विकसित करें",
          ],
          te: [
            "ఆర్థికశాస్త్రం మరియు ఫైనాన్స్ గురించి తెలుసుకోండి",
            "వ్యాపార క్లబ్‌లు లేదా పోటీలలో చేరండి",
            "కమ్యూనికేషన్ మరియు టీమ్‌వర్క్ నైపుణ్యాలను అభివృద్ధి చేయండి",
          ],
          ta: [
            "பொருளாதாரம் மற்றும் நிதி பற்றி அறிக",
            "வணிக கழகங்கள் அல்லது போட்டிகளில் சேரவும்",
            "தொடர்பு மற்றும் குழு பணி திறன்களை வளர்த்துக் கொள்ளுங்கள்",
          ],
          bn: [
            "অর্থনীতি এবং অর্থসংস্থান সম্পর্কে জানুন",
            "ব্যবসা ক্লাব বা প্রতিযোগিতায় যোগ দিন",
            "যোগাযোগ এবং টিমওয়ার্ক দক্ষতা বিকাশ করুন",
          ],
          gu: [
            "અર્થશાસ્ત્ર અને નાણાં વિશે જાણો",
            "વ્યવસાય ક્લબ અથવા સ્પર્ધાઓમાં જોડાઓ",
            "સંચાર અને ટીમવર્ક કુશળતા વિકસાવો",
          ],
        },
      },
    ];

    // Score and sort careers
    const scoredCareers = careerOptions
      .map((career) => ({
        ...career,
        finalScore: career.score,
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 4); // Take top 4

    // Generate recommendations
    const recommendations = scoredCareers.map((career, index) => {
      const confidence = Math.max(0.65, Math.min(0.85, 0.85 - index * 0.05));
      const reasonFunc = (career.reason[language] || career.reason.en) as (
        subjects?: string[]
      ) => string;
      const reason = reasonFunc(analysis.preferredSubjects);

      return {
        title: career.title[language] || career.title.en,
        confidence: Math.round(confidence * 100) / 100,
        reason,
        next_steps: career.nextSteps[language] || career.nextSteps.en,
      };
    });

    // Generate summary
    const summaries: Record<Language, string> = {
      en: analysis.careerInterest
        ? `Based on your assessment and interest in ${analysis.careerInterest}, we've identified several exciting career paths for you.`
        : "Based on your assessment, we've identified several exciting career paths. Explore these options to find what interests you most!",
      hi: analysis.careerInterest
        ? `आपके मूल्यांकन और ${analysis.careerInterest} में रुचि के आधार पर, हमने आपके लिए कई रोमांचक करियर पथों की पहचान की है।`
        : "आपके मूल्यांकन के आधार पर, हमने कई रोमांचक करियर पथों की पहचान की है। अपनी रुचि के अनुसार इन विकल्पों का अन्वेषण करें!",
      te: analysis.careerInterest
        ? `మీ అసెస్‌మెంట్ మరియు ${analysis.careerInterest}లో ఆసక్తి ఆధారంగా, మేము మీ కోసం అనేక ఉత్తేజకరమైన కెరీర్ మార్గాలను గుర్తించాము।`
        : "మీ అసెస్‌మెంట్ ఆధారంగా, మేము అనేక ఉత్తేజకరమైన కెరీర్ మార్గాలను గుర్తించాము. మీకు ఆసక్తి ఉన్న వాటిని కనుగొనడానికి ఈ ఎంపికలను అన్వేషించండి!",
      ta: analysis.careerInterest
        ? `உங்கள் மதிப்பீடு மற்றும் ${analysis.careerInterest}ல் உள்ள ஆர்வத்தின் அடிப்படையில், உங்களுக்கான பல சுவாரஸ்யமான தொழில் பாதைகளை நாங்கள் கண்டறிந்துள்ளோம்।`
        : "உங்கள் மதிப்பீட்டின் அடிப்படையில், பல சுவாரஸ்யமான தொழில் பாதைகளை நாங்கள் கண்டறிந்துள்ளோம். உங்கள் ஆர்வத்தைக் கண்டறிய இந்த விருப்பங்களை ஆராயுங்கள்!",
      bn: analysis.careerInterest
        ? `আপনার মূল্যায়ন এবং ${analysis.careerInterest}তে আগ্রহের ভিত্তিতে, আমরা আপনার জন্য বেশ কয়েকটি উত্তেজনাপূর্ণ ক্যারিয়ার পথ চিহ্নিত করেছি।`
        : "আপনার মূল্যায়নের ভিত্তিতে, আমরা বেশ কয়েকটি উত্তেজনাপূর্ণ ক্যারিয়ার পথ চিহ্নিত করেছি। আপনার আগ্রহ খুঁজে পেতে এই বিকল্পগুলি অন্বেষণ করুন!",
      gu: analysis.careerInterest
        ? `તમારા મૂલ્યાંકન અને ${analysis.careerInterest}માં રુચિના આધારે, અમે તમારા માટે અનેક રોમાંચક કારકિર્દી માર્ગો ઓળખ્યા છે।`
        : "તમારા મૂલ્યાંકનના આધારે, અમે અનેક રોમાંચક કારકિર્દી માર્ગો ઓળખ્યા છે. તમારી રુચિ શોધવા માટે આ વિકલ્પોનું અન્વેષણ કરો!",
    };

    return {
      recommendations,
      summary: summaries[language] || summaries.en,
    };
  }

  // Keep old static fallback as backup (not used anymore but kept for reference)
  private getStaticFallbackRecommendations(
    language: Language
  ): AssessmentResponse {
    const fallbacks: Record<Language, AssessmentResponse> = {
      en: {
        recommendations: [
          {
            title: "Software Developer",
            confidence: 0.75,
            reason:
              "Technology careers offer great opportunities for problem-solving and creativity",
            next_steps: [
              "Learn programming basics (Python or JavaScript)",
              "Build small projects",
              "Take computer science courses",
            ],
          },
          {
            title: "Data Analyst",
            confidence: 0.72,
            reason:
              "Data-driven careers combine analytical thinking with real-world impact",
            next_steps: [
              "Learn statistics and data visualization",
              "Practice with Excel and data tools",
              "Explore data science courses",
            ],
          },
          {
            title: "Engineering",
            confidence: 0.7,
            reason:
              "Engineering offers diverse paths in various fields like mechanical, electrical, or civil",
            next_steps: [
              "Focus on math and science subjects",
              "Join engineering clubs or competitions",
              "Research different engineering disciplines",
            ],
          },
          {
            title: "Business & Management",
            confidence: 0.68,
            reason:
              "Business careers develop leadership and strategic thinking skills",
            next_steps: [
              "Learn about economics and finance",
              "Join business clubs or competitions",
              "Develop communication and teamwork skills",
            ],
          },
        ],
        summary:
          "Based on your assessment, we've identified several exciting career paths. Explore these options to find what interests you most!",
      },
      hi: {
        recommendations: [
          {
            title: "सॉफ्टवेयर डेवलपर",
            confidence: 0.75,
            reason:
              "तकनीकी करियर समस्या-समाधान और रचनात्मकता के लिए बेहतरीन अवसर प्रदान करते हैं",
            next_steps: [
              "प्रोग्रामिंग की मूल बातें सीखें (Python या JavaScript)",
              "छोटी परियोजनाएं बनाएं",
              "कंप्यूटर विज्ञान पाठ्यक्रम लें",
            ],
          },
          {
            title: "डेटा विश्लेषक",
            confidence: 0.72,
            reason:
              "डेटा-संचालित करियर विश्लेषणात्मक सोच को वास्तविक दुनिया के प्रभाव के साथ जोड़ते हैं",
            next_steps: [
              "सांख्यिकी और डेटा विज़ुअलाइज़ेशन सीखें",
              "Excel और डेटा टूल्स के साथ अभ्यास करें",
              "डेटा साइंस पाठ्यक्रमों का अन्वेषण करें",
            ],
          },
          {
            title: "इंजीनियरिंग",
            confidence: 0.7,
            reason:
              "इंजीनियरिंग यांत्रिक, विद्युत, या सिविल जैसे विभिन्न क्षेत्रों में विविध पथ प्रदान करती है",
            next_steps: [
              "गणित और विज्ञान विषयों पर ध्यान दें",
              "इंजीनियरिंग क्लब या प्रतियोगिताओं में शामिल हों",
              "विभिन्न इंजीनियरिंग विषयों पर शोध करें",
            ],
          },
          {
            title: "व्यवसाय और प्रबंधन",
            confidence: 0.68,
            reason: "व्यवसाय करियर नेतृत्व और रणनीतिक सोच कौशल विकसित करते हैं",
            next_steps: [
              "अर्थशास्त्र और वित्त के बारे में जानें",
              "व्यवसाय क्लब या प्रतियोगिताओं में शामिल हों",
              "संचार और टीमवर्क कौशल विकसित करें",
            ],
          },
        ],
        summary:
          "आपके मूल्यांकन के आधार पर, हमने कई रोमांचक करियर पथों की पहचान की है। अपनी रुचि के अनुसार इन विकल्पों का अन्वेषण करें!",
      },
      te: {
        recommendations: [
          {
            title: "సాఫ్ట్‌వేర్ డెవలపర్",
            confidence: 0.75,
            reason:
              "టెక్నాలజీ కెరీర్లు సమస్య-పరిష్కారం మరియు సృజనాత్మకతకు గొప్ప అవకాశాలను అందిస్తాయి",
            next_steps: [
              "ప్రోగ్రామింగ్ ప్రాథమికాలు నేర్చుకోండి (Python లేదా JavaScript)",
              "చిన్న ప్రాజెక్ట్‌లను నిర్మించండి",
              "కంప్యూటర్ సైన్స్ కోర్సులు తీసుకోండి",
            ],
          },
          {
            title: "డేటా విశ్లేషకుడు",
            confidence: 0.72,
            reason:
              "డేటా-ఆధారిత కెరీర్లు విశ్లేషణాత్మక ఆలోచనను వాస్తవ ప్రపంచ ప్రభావంతో కలుపుతాయి",
            next_steps: [
              "గణాంకాలు మరియు డేటా విజువలైజేషన్ నేర్చుకోండి",
              "Excel మరియు డేటా టూల్స్‌తో ప్రాక్టీస్ చేయండి",
              "డేటా సైన్స్ కోర్సులను అన్వేషించండి",
            ],
          },
          {
            title: "ఇంజనీరింగ్",
            confidence: 0.7,
            reason:
              "ఇంజనీరింగ్ మెకానికల్, ఎలక్ట్రికల్, లేదా సివిల్ వంటి వివిధ రంగాలలో వివిధ మార్గాలను అందిస్తుంది",
            next_steps: [
              "గణితం మరియు సైన్స్ విషయాలపై దృష్టి పెట్టండి",
              "ఇంజనీరింగ్ క్లబ్‌లు లేదా పోటీలలో చేరండి",
              "వివిధ ఇంజనీరింగ్ విభాగాలపై పరిశోధన చేయండి",
            ],
          },
          {
            title: "వ్యాపారం మరియు నిర్వహణ",
            confidence: 0.68,
            reason:
              "వ్యాపార కెరీర్లు నాయకత్వం మరియు వ్యూహాత్మక ఆలోచన నైపుణ్యాలను అభివృద్ధి చేస్తాయి",
            next_steps: [
              "ఆర్థికశాస్త్రం మరియు ఫైనాన్స్ గురించి తెలుసుకోండి",
              "వ్యాపార క్లబ్‌లు లేదా పోటీలలో చేరండి",
              "కమ్యూనికేషన్ మరియు టీమ్‌వర్క్ నైపుణ్యాలను అభివృద్ధి చేయండి",
            ],
          },
        ],
        summary:
          "మీ అసెస్‌మెంట్ ఆధారంగా, మేము అనేక ఉత్తేజకరమైన కెరీర్ మార్గాలను గుర్తించాము. మీకు ఆసక్తి ఉన్న వాటిని కనుగొనడానికి ఈ ఎంపికలను అన్వేషించండి!",
      },
      ta: {
        recommendations: [
          {
            title: "மென்பொருள் உருவாக்குநர்",
            confidence: 0.75,
            reason:
              "தொழில்நுட்ப தொழில்கள் சிக்கல் தீர்ப்பு மற்றும் படைப்பாற்றலுக்கு சிறந்த வாய்ப்புகளை வழங்குகின்றன",
            next_steps: [
              "நிரலாக்க அடிப்படைகளைக் கற்றுக்கொள்ளுங்கள் (Python அல்லது JavaScript)",
              "சிறிய திட்டங்களை உருவாக்குங்கள்",
              "கணினி அறிவியல் படிப்புகளை எடுத்துக்கொள்ளுங்கள்",
            ],
          },
          {
            title: "தரவு பகுப்பாய்வாளர்",
            confidence: 0.72,
            reason:
              "தரவு-ஆதார தொழில்கள் பகுப்பாய்வு சிந்தனையை உண்மையான உலக தாக்கத்துடன் இணைக்கின்றன",
            next_steps: [
              "புள்ளிவிவரங்கள் மற்றும் தரவு காட்சிப்படுத்தலைக் கற்றுக்கொள்ளுங்கள்",
              "Excel மற்றும் தரவு கருவிகளுடன் பயிற்சி செய்யுங்கள்",
              "தரவு அறிவியல் படிப்புகளை ஆராயுங்கள்",
            ],
          },
          {
            title: "பொறியியல்",
            confidence: 0.7,
            reason:
              "பொறியியல் இயந்திர, மின் அல்லது குடிசார் போன்ற பல்வேறு துறைகளில் பல்வேறு பாதைகளை வழங்குகிறது",
            next_steps: [
              "கணிதம் மற்றும் அறிவியல் பாடங்களில் கவனம் செலுத்துங்கள்",
              "பொறியியல் கழகங்கள் அல்லது போட்டிகளில் சேரவும்",
              "வெவ்வேறு பொறியியல் துறைகளை ஆராயுங்கள்",
            ],
          },
          {
            title: "வணிகம் மற்றும் மேலாண்மை",
            confidence: 0.68,
            reason:
              "வணிக தொழில்கள் தலைமைத்துவம் மற்றும் உத்தியியல் சிந்தனை திறன்களை வளர்க்கின்றன",
            next_steps: [
              "பொருளாதாரம் மற்றும் நிதி பற்றி அறிக",
              "வணிக கழகங்கள் அல்லது போட்டிகளில் சேரவும்",
              "தொடர்பு மற்றும் குழு பணி திறன்களை வளர்த்துக் கொள்ளுங்கள்",
            ],
          },
        ],
        summary:
          "உங்கள் மதிப்பீட்டின் அடிப்படையில், பல சுவாரஸ்யமான தொழில் பாதைகளை நாங்கள் கண்டறிந்துள்ளோம். உங்கள் ஆர்வத்தைக் கண்டறிய இந்த விருப்பங்களை ஆராயுங்கள்!",
      },
      bn: {
        recommendations: [
          {
            title: "সফটওয়্যার ডেভেলপার",
            confidence: 0.75,
            reason:
              "প্রযুক্তি ক্যারিয়ার সমস্যা সমাধান এবং সৃজনশীলতার জন্য দুর্দান্ত সুযোগ প্রদান করে",
            next_steps: [
              "প্রোগ্রামিং বেসিক শিখুন (Python বা JavaScript)",
              "ছোট প্রজেক্ট তৈরি করুন",
              "কম্পিউটার সায়েন্স কোর্স নিন",
            ],
          },
          {
            title: "ডেটা অ্যানালিস্ট",
            confidence: 0.72,
            reason:
              "ডেটা-চালিত ক্যারিয়ার বিশ্লেষণাত্মক চিন্তাভাবনাকে বাস্তব বিশ্বের প্রভাবের সাথে যুক্ত করে",
            next_steps: [
              "পরিসংখ্যান এবং ডেটা ভিজ্যুয়ালাইজেশন শিখুন",
              "Excel এবং ডেটা টুলস দিয়ে অনুশীলন করুন",
              "ডেটা সায়েন্স কোর্স অন্বেষণ করুন",
            ],
          },
          {
            title: "ইঞ্জিনিয়ারিং",
            confidence: 0.7,
            reason:
              "ইঞ্জিনিয়ারিং যান্ত্রিক, বৈদ্যুতিক বা সিভিলের মতো বিভিন্ন ক্ষেত্রে বৈচিত্র্যময় পথ প্রদান করে",
            next_steps: [
              "গণিত এবং বিজ্ঞান বিষয়ে ফোকাস করুন",
              "ইঞ্জিনিয়ারিং ক্লাব বা প্রতিযোগিতায় যোগ দিন",
              "বিভিন্ন ইঞ্জিনিয়ারিং শাখা নিয়ে গবেষণা করুন",
            ],
          },
          {
            title: "ব্যবসা ও ব্যবস্থাপনা",
            confidence: 0.68,
            reason:
              "ব্যবসা ক্যারিয়ার নেতৃত্ব এবং কৌশলগত চিন্তাভাবনার দক্ষতা বিকাশ করে",
            next_steps: [
              "অর্থনীতি এবং অর্থসংস্থান সম্পর্কে জানুন",
              "ব্যবসা ক্লাব বা প্রতিযোগিতায় যোগ দিন",
              "যোগাযোগ এবং টিমওয়ার্ক দক্ষতা বিকাশ করুন",
            ],
          },
        ],
        summary:
          "আপনার মূল্যায়নের ভিত্তিতে, আমরা বেশ কয়েকটি উত্তেজনাপূর্ণ ক্যারিয়ার পথ চিহ্নিত করেছি। আপনার আগ্রহ খুঁজে পেতে এই বিকল্পগুলি অন্বেষণ করুন!",
      },
      gu: {
        recommendations: [
          {
            title: "સોફ્ટવેર ડેવલપર",
            confidence: 0.75,
            reason:
              "ટેક્નોલોજી કારકિર્દી સમસ્યા-ઉકેલ અને સર્જનાત્મકતા માટે મહાન તકો પ્રદાન કરે છે",
            next_steps: [
              "પ્રોગ્રામિંગ મૂળભૂત જાણો (Python અથવા JavaScript)",
              "નાના પ્રોજેક્ટ બનાવો",
              "કમ્પ્યુટર સાયન્સ કોર્સ લો",
            ],
          },
          {
            title: "ડેટા એનાલિસ્ટ",
            confidence: 0.72,
            reason:
              "ડેટા-ચાલિત કારકિર્દી વિશ્લેષણાત્મક વિચારસરણીને વાસ્તવિક વિશ્વના પ્રભાવ સાથે જોડે છે",
            next_steps: [
              "આંકડાશાસ્ત્ર અને ડેટા વિઝ્યુઅલાઇઝેશન શીખો",
              "Excel અને ડેટા ટૂલ્સ સાથે પ્રેક્ટિસ કરો",
              "ડેટા સાયન્સ કોર્સ અન્વેષણ કરો",
            ],
          },
          {
            title: "એન્જિનિયરિંગ",
            confidence: 0.7,
            reason:
              "એન્જિનિયરિંગ મિકેનિકલ, ઇલેક્ટ્રિકલ અથવા સિવિલ જેવા વિવિધ ક્ષેત્રોમાં વિવિધ માર્ગો પ્રદાન કરે છે",
            next_steps: [
              "ગણિત અને વિજ્ઞાન વિષયો પર ધ્યાન કેન્દ્રિત કરો",
              "એન્જિનિયરિંગ ક્લબ અથવા સ્પર્ધાઓમાં જોડાઓ",
              "વિવિધ એન્જિનિયરિંગ શાખાઓ પર સંશોધન કરો",
            ],
          },
          {
            title: "વ્યવસાય અને વ્યવસ્થાપન",
            confidence: 0.68,
            reason:
              "વ્યવસાય કારકિર્દી નેતૃત્વ અને વ્યૂહાત્મક વિચારસરણી કુશળતા વિકસાવે છે",
            next_steps: [
              "અર્થશાસ્ત્ર અને નાણાં વિશે જાણો",
              "વ્યવસાય ક્લબ અથવા સ્પર્ધાઓમાં જોડાઓ",
              "સંચાર અને ટીમવર્ક કુશળતા વિકસાવો",
            ],
          },
        ],
        summary:
          "તમારા મૂલ્યાંકનના આધારે, અમે અનેક રોમાંચક કારકિર્દી માર્ગો ઓળખ્યા છે. તમારી રુચિ શોધવા માટે આ વિકલ્પોનું અન્વેષણ કરો!",
      },
    };

    return fallbacks[language] || fallbacks.en;
  }

  async generateChatResponse(
    message: string,
    context: {
      assessmentSummary?: string;
      previousMessages?: ChatMessage[];
      language: Language;
    },
    retryOptions?: RetryOptions
  ): Promise<{ reply: string; intent: string }> {
    const systemPrompt = this.getSystemPrompt(context.language, "chat");

    let conversationContext = "";
    if (context.assessmentSummary) {
      conversationContext = `Assessment Summary: ${context.assessmentSummary}\n\n`;
    }

    if (context.previousMessages && context.previousMessages.length > 0) {
      conversationContext += "Recent conversation:\n";
      context.previousMessages.slice(-5).forEach((msg) => {
        conversationContext += `${
          msg.role === "user" ? "Student" : "Assistant"
        }: ${msg.content}\n`;
      });
    }

    const prompt = `${systemPrompt}\n\n${conversationContext}Student: ${message}\n\nAssistant:`;

    try {
      const response = await retryWithBackoff(async () => {
        const model = this.genAI.getGenerativeModel({ model: this.modelId });
        const result = await model.generateContent(prompt);
        return result.response.text();
      }, retryOptions);

      return this.parseChatResponse(response, context.language);
    } catch (error: any) {
      console.error("Error generating chat response:", error);

      // Fallback response
      const fallbacks: Record<Language, { reply: string; intent: string }> = {
        en: {
          reply:
            "I'm having trouble processing that right now. Could you try rephrasing your question?",
          intent: "error",
        },
        hi: {
          reply:
            "अभी मैं इसे संसाधित करने में परेशानी हो रही है। क्या आप अपना प्रश्न दोबारा लिख सकते हैं?",
          intent: "error",
        },
        te: {
          reply:
            "ప్రస్తుతం దాన్ని ప్రాసెస్ చేయడంలో నాకు సమస్య ఉంది. మీరు మీ ప్రశ్నను మళ్లీ రాయగలరా?",
          intent: "error",
        },
        ta: {
          reply:
            "தற்போது அதை செயலாக்குவதில் சிக்கல் உள்ளது. உங்கள் கேள்வியை மீண்டும் எழுதலாமா?",
          intent: "error",
        },
        bn: {
          reply:
            "এখন এটি প্রক্রিয়া করতে সমস্যা হচ্ছে। আপনি কি আপনার প্রশ্নটি আবার লিখতে পারেন?",
          intent: "error",
        },
        gu: {
          reply:
            "હમણાં તેને પ્રક્રિયા કરવામાં સમસ્યા આવી રહી છે. શું તમે તમારો પ્રશ્ન ફરીથી લખી શકો છો?",
          intent: "error",
        },
      };

      return fallbacks[context.language] || fallbacks.en;
    }
  }

  private parseChatResponse(
    response: string,
    language: Language
  ): { reply: string; intent: string } {
    try {
      // Try to extract JSON
      let jsonStr = response.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }

      // Try parsing as JSON first
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.reply && parsed.intent) {
          return { reply: parsed.reply, intent: parsed.intent };
        }
      } catch {
        // If not JSON, treat as plain text
      }

      // If not JSON or invalid, return as-is with default intent
      return {
        reply: jsonStr,
        intent: "follow_up",
      };
    } catch (error) {
      console.error("Failed to parse chat response:", error);
      return {
        reply: response,
        intent: "follow_up",
      };
    }
  }
}
