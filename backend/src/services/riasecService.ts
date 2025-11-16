import * as fs from 'fs';
import * as path from 'path';

// RIASEC question mapping - maps question ID to RIASEC code
// This matches the order in riasec_questions.csv
const RIASEC_QUESTION_MAPPING: { [questionId: number]: string } = {
  1: 'C', 2: 'S', 3: 'E', 4: 'S', 5: 'C', 6: 'E', 7: 'S', 8: 'E', 9: 'I', 10: 'E',
  11: 'E', 12: 'I', 13: 'I', 14: 'I', 15: 'I', 16: 'I', 17: 'S', 18: 'C', 19: 'I', 20: 'C',
  21: 'S', 22: 'C', 23: 'S', 24: 'C', 25: 'R', 26: 'R', 27: 'I', 28: 'S', 29: 'A', 30: 'A',
  31: 'A', 32: 'E', 33: 'A', 34: 'R', 35: 'R', 36: 'C', 37: 'R', 38: 'E', 39: 'A', 40: 'E',
  41: 'R', 42: 'C', 43: 'A', 44: 'A', 45: 'S', 46: 'R', 47: 'A', 48: 'R'
};

// Map answer strings to Likert scale (1-5)
const ANSWER_TO_SCORE: { [key: string]: number } = {
  // English
  'strongly disagree': 1,
  'disagree': 2,
  'neutral': 3,
  'agree': 4,
  'strongly agree': 5,
  // Hindi
  'बिल्कुल असहमत': 1,
  'असहमत': 2,
  'तटस्थ': 3,
  'सहमत': 4,
  'पूर्णतः सहमत': 5,
  // Telugu
  'పూర్తిగా అంగీకరించను': 1,
  'అంగీకరించను': 2,
  'తటస్థ': 3,
  'అంగీకరిస్తున్నాను': 4,
  'పూర్తిగా అంగీకరిస్తున్నాను': 5,
  // Tamil
  'முற்றிலும் மறுக்கிறேன்': 1,
  'மறுக்கிறேன்': 2,
  'நடுநிலை': 3,
  'ஒப்புக்கொள்கிறேன்': 4,
  'முற்றிலும் ஒப்புக்கொள்கிறேன்': 5,
  // Bengali
  'সম্পূর্ণ অসম্মত': 1,
  'অসম্মত': 2,
  'নিরপেক্ষ': 3,
  'সম্মত': 4,
  'সম্পূর্ণ সম্মত': 5,
  // Gujarati
  'સંપૂર્ણ અસહમત': 1,
  'અસહમત': 2,
  'તટસ્થ': 3,
  'સહમત': 4,
  'સંપૂર્ણ સહમત': 5,
};

export interface RIASECScoreResult {
  scores: { [code: string]: number }; // R, I, A, S, E, C scores (0-100)
  top3: string; // Top 3 RIASEC codes (e.g., "IES")
  ordered: Array<{ code: string; score: number }>; // All codes sorted by score
}

/**
 * Converts answer string to Likert scale score (1-5)
 */
function answerToScore(answer: string | string[]): number {
  const answerStr = Array.isArray(answer) ? answer[0] : answer;
  const normalized = answerStr.toLowerCase().trim();
  
  // Direct lookup
  if (ANSWER_TO_SCORE[normalized]) {
    return ANSWER_TO_SCORE[normalized];
  }
  
  // Fallback: try partial matches
  for (const [key, score] of Object.entries(ANSWER_TO_SCORE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return score;
    }
  }
  
  // Default to neutral if no match
  return 3;
}

/**
 * Calculates RIASEC scores from test answers
 * @param answers - Object mapping question ID (as string) to answer value
 * @returns RIASEC score result with normalized scores and top 3 codes
 */
export function calculateRIASECScore(
  answers: { [questionId: string]: string | string[] }
): RIASECScoreResult {
  const scores: { [code: string]: number } = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts: { [code: string]: number } = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  // Process each answer
  for (const [questionIdStr, answer] of Object.entries(answers)) {
    const questionId = parseInt(questionIdStr, 10);
    const riasecCode = RIASEC_QUESTION_MAPPING[questionId];
    
    if (!riasecCode) {
      console.warn(`No RIASEC code found for question ${questionId}`);
      continue;
    }

    const score = answerToScore(answer);
    scores[riasecCode] += score;
    counts[riasecCode] += 1;
  }

  // Calculate averages
  for (const code of Object.keys(scores)) {
    if (counts[code] > 0) {
      scores[code] = scores[code] / counts[code];
    }
  }

  // Store averages before normalization for debugging
  const averagesBeforeNormalization = { ...scores };

  // Normalize to 0-100 scale
  const scoreValues = Object.values(scores);
  const minScore = Math.min(...scoreValues);
  const maxScore = Math.max(...scoreValues);
  
  if (maxScore !== minScore) {
    for (const code of Object.keys(scores)) {
      scores[code] = 100 * (scores[code] - minScore) / (maxScore - minScore);
    }
  } else {
    // If all scores are equal, set to 50
    for (const code of Object.keys(scores)) {
      scores[code] = 50;
    }
  }

  // Sort by score (descending) - use AVERAGES, not normalized scores for ranking
  // This ensures we rank by actual preference, not normalized values
  const ordered = Object.entries(averagesBeforeNormalization)
    .map(([code, avgScore]) => ({ 
      code, 
      averageScore: avgScore,
      normalizedScore: scores[code]
    }))
    .sort((a, b) => b.averageScore - a.averageScore);

  // Get top 3 codes based on average scores (before normalization)
  const top3 = ordered.slice(0, 3).map(item => item.code).join('');

  // Debug logging
  console.log('=== RIASEC Score Calculation Debug ===');
  console.log('Total answers processed:', Object.keys(answers).length);
  console.log('Question counts per code:', counts);
  console.log('Average scores (before normalization - used for ranking):', Object.fromEntries(
    Object.entries(averagesBeforeNormalization).map(([code, score]) => [code, score.toFixed(2)])
  ));
  console.log('Normalized scores (0-100 - for display only):', Object.fromEntries(
    Object.entries(scores).map(([code, score]) => [code, score.toFixed(2)])
  ));
  console.log('Ordered by average score:', ordered.map(item => `${item.code}: avg=${item.averageScore.toFixed(2)}, norm=${item.normalizedScore.toFixed(2)}`).join(', '));
  console.log('Top 3 (by average):', top3);
  console.log('=====================================');

  // Return normalized scores for display, but ordered by average scores
  return {
    scores, // Normalized scores (0-100) for display
    top3,
    ordered: ordered.map(item => ({ code: item.code, score: item.normalizedScore })), // Use normalized for display
  };
}

/**
 * Loads careers from CSV file and returns careers matching RIASEC codes
 * @param riasecCodes - String of 1-3 RIASEC codes (e.g., "IES", "R", "AS")
 * @returns Array of matching career names
 */
export function getCareersByRIASECCode(riasecCodes: string): string[] {
  const csvPath = path.join(__dirname, '../../..', 'careers_with_riasec_codes.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Careers CSV not found at: ${csvPath}`);
    return [];
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const matchingCareers: string[] = [];
  const codesArray = riasecCodes.split('').filter(c => c.length > 0);
  
  // First pass: Try to match codes with letters in order
  for (const line of dataLines) {
    // Parse CSV: find the last comma and split there
    // This handles careers with commas in their names
    const lastCommaIndex = line.lastIndexOf(',');
    if (lastCommaIndex === -1) continue;
    
    const career = line.substring(0, lastCommaIndex).trim().replace(/^"|"$/g, '');
    const careerCode = line.substring(lastCommaIndex + 1).trim();
    
    // Match careers where the code:
    // 1. Starts with the top 3 codes in order (e.g., "RIA" matches "RIA", "RIAS", "RIAC")
    // 2. Contains the top 3 codes as a substring in order (e.g., "RIA" matches "XRIA", "RIASEC")
    // 3. Has all letters in the same order (e.g., "RIA" matches codes where R comes before I, I comes before A)
    
    let matches = false;
    
    // Priority 1: Exact match or starts with the codes
    if (careerCode.startsWith(riasecCodes)) {
      matches = true;
    }
    // Priority 2: Contains the codes as substring in order
    else if (careerCode.includes(riasecCodes)) {
      matches = true;
    }
    // Priority 3: Check if all letters appear in order (R before I before A)
    else {
      const careerCodeLetters = careerCode.split('');
      let lastIndex = -1;
      let allInOrder = true;
      
      for (const code of codesArray) {
        const currentIndex = careerCodeLetters.indexOf(code, lastIndex + 1);
        if (currentIndex === -1) {
          allInOrder = false;
          break;
        }
        lastIndex = currentIndex;
      }
      
      matches = allInOrder;
    }
    
    if (matches) {
      matchingCareers.push(career);
    }
  }
  
  // If no matches found with ordered logic, fall back to matching codes that contain all letters in any order
  if (matchingCareers.length === 0) {
    const generatePermutations = (arr: string[]): string[] => {
      if (arr.length <= 1) return arr;
      const result: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const perms = generatePermutations(rest);
        for (const perm of perms) {
          result.push(arr[i] + perm);
        }
      }
      return result;
    };
    
    const permutations = generatePermutations(codesArray);
    
    for (const line of dataLines) {
      const lastCommaIndex = line.lastIndexOf(',');
      if (lastCommaIndex === -1) continue;
      
      const career = line.substring(0, lastCommaIndex).trim().replace(/^"|"$/g, '');
      const careerCode = line.substring(lastCommaIndex + 1).trim();
      
      // Check if career code:
      // 1. Is an exact permutation match (RIA, RAI, IAR, IRA, ARI, AIR)
      // 2. Starts with any permutation
      // 3. Contains any permutation as substring
      // 4. Contains all letters in any order (fallback)
      let matches = false;
      
      // Check exact permutation match
      if (permutations.includes(careerCode)) {
        matches = true;
      }
      // Check if code starts with any permutation
      else if (permutations.some(perm => careerCode.startsWith(perm))) {
        matches = true;
      }
      // Check if code contains any permutation as substring
      else if (permutations.some(perm => careerCode.includes(perm))) {
        matches = true;
      }
      // Fallback: Check if career code contains all letters from riasecCodes (in any order)
      else {
        const careerCodeLetters = careerCode.split('');
        const allCodesPresent = codesArray.every(code => careerCodeLetters.includes(code));
        matches = allCodesPresent;
      }
      
      if (matches) {
        matchingCareers.push(career);
      }
    }
  }
  
  return matchingCareers;
}

