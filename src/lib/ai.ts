import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: process.env.NODE_ENV === 'test'
    });
  }
  return openai;
}

export interface AIResponse {
  reply: string;
  isCrisis: boolean;
  flagged: boolean;
  reason?: string;
}

export interface CrisisDetectionResult {
  isCrisis: boolean;
  keywords: string[];
}

export interface PolicyFilterResult {
  passed: boolean;
  violations: string[];
}

// Crisis keywords for detection
const CRISIS_KEYWORDS = process.env.CRISIS_KEYWORDS?.split(",") || [
  "lawsuit",
  "legal action",
  "health department",
  "unsafe",
  "contaminated",
  "poisoned",
  "terrible service",
  "worst experience",
  "never again",
  "horrible",
  "disgusting",
];

// Banned phrases for policy filtering
const BANNED_PHRASES = process.env.BANNED_PHRASES?.split(",") || [
  "refund guaranteed",
  "always",
  "never",
  "free meal",
  "100% satisfaction",
  "perfect",
  "flawless",
];

// PII detection regex patterns
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
  /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
];

export function detectCrisis(text: string): CrisisDetectionResult {
  const lowerText = text.toLowerCase();
  const foundKeywords = CRISIS_KEYWORDS.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase()),
  );

  return {
    isCrisis: foundKeywords.length > 0,
    keywords: foundKeywords,
  };
}

export function filterPolicy(text: string): PolicyFilterResult {
  const violations: string[] = [];

  // Check for PII
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(text)) {
      violations.push("Contains PII (email, phone, SSN, or credit card)");
    }
  }

  // Check for banned phrases
  const lowerText = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      violations.push(`Contains banned phrase: "${phrase}"`);
    }
  }

  // Check length
  if (text.length > 500) {
    violations.push("Exceeds maximum length of 500 characters");
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export async function generateReply({
  businessName,
  brandRules,
  tone,
  stars,
  reviewText,
  isCrisis = false,
}: {
  businessName: string;
  brandRules: string;
  tone: string;
  stars: number;
  reviewText: string;
  isCrisis?: boolean;
}): Promise<AIResponse> {
  try {
    // Detect crisis keywords
    const crisisDetection = detectCrisis(reviewText);
    const isCrisisDetected = crisisDetection.isCrisis || isCrisis;

    // Build system prompt
    const systemPrompt = `You are an expert restaurant manager with 15+ years of experience in customer service and reputation management. You are empathetic, professional, and focused on resolving customer concerns while protecting the business's reputation.

Key Guidelines:
- Always be empathetic and understanding
- Acknowledge the customer's experience
- Take responsibility when appropriate
- Offer specific solutions, not generic responses
- Keep responses under 150 words
- Be specific and avoid absolutes (always/never)
- Don't make promises you can't keep
- For 4-5 star reviews: thank them and invite them back
- For 1-3 star reviews: apologize and offer to resolve offline
- For crisis situations: acknowledge concern, take responsibility, offer immediate resolution
- Never mention competitors or make comparisons
- Don't offer free meals or discounts unless specifically appropriate
- End with a call to action or invitation to return

Business: ${businessName}
Brand Rules: ${brandRules}
Tone: ${tone}
${isCrisisDetected ? "CRISIS SITUATION DETECTED - Handle with extra care and urgency" : ""}`;

    // Build user prompt
    const userPrompt = `Review Details:
Stars: ${stars}/5
Review: "${reviewText}"

${isCrisisDetected ? "This is a crisis situation that requires immediate attention and careful handling." : ""}

Generate a professional, empathetic response that addresses the customer's concerns while maintaining the business's reputation.`;

    const openaiClient = getOpenAI();
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "";

    // Apply policy filter
    const policyResult = filterPolicy(reply);

    return {
      reply,
      isCrisis: isCrisisDetected,
      flagged: !policyResult.passed,
      reason: policyResult.violations.join("; "),
    };
  } catch (error) {
    console.error("Error generating AI reply:", error);
    throw new Error("Failed to generate reply");
  }
}
