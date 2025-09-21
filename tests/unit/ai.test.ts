import { detectCrisis, filterPolicy, generateReply } from "@/lib/ai";

// Mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content:
                    "Thank you for your feedback! We appreciate your business.",
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe("AI Service", () => {
  describe("detectCrisis", () => {
    it("should detect crisis keywords", () => {
      const review =
        "This is terrible service and I am considering legal action";
      const result = detectCrisis(review);

      expect(result.isCrisis).toBe(true);
      expect(result.keywords).toContain("legal action");
    });

    it("should not detect crisis in normal review", () => {
      const review = "Great food and excellent service!";
      const result = detectCrisis(review);

      expect(result.isCrisis).toBe(false);
      expect(result.keywords).toHaveLength(0);
    });
  });

  describe("filterPolicy", () => {
    it("should detect PII in review", () => {
      const review = "Please contact me at john@example.com";
      const result = filterPolicy(review);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        "Contains PII (email, phone, SSN, or credit card)",
      );
    });

    it("should detect banned phrases", () => {
      const review = "I guarantee you will always be satisfied";
      const result = filterPolicy(review);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes("always"))).toBe(true);
    });

    it("should detect length violations", () => {
      const longReview = "a".repeat(501);
      const result = filterPolicy(longReview);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        "Exceeds maximum length of 500 characters",
      );
    });

    it("should pass valid review", () => {
      const review = "Great service and delicious food!";
      const result = filterPolicy(review);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe("generateReply", () => {
    it("should generate a reply for positive review", async () => {
      const result = await generateReply({
        businessName: "Test Restaurant",
        brandRules: "Be friendly and professional",
        tone: "friendly",
        stars: 5,
        reviewText: "Amazing food and service!",
      });

      expect(result.reply).toBeDefined();
      expect(result.reply.length).toBeGreaterThan(0);
      expect(result.isCrisis).toBe(false);
      expect(result.flagged).toBe(false);
    });

    it("should detect crisis in review", async () => {
      const result = await generateReply({
        businessName: "Test Restaurant",
        brandRules: "Be friendly and professional",
        tone: "friendly",
        stars: 1,
        reviewText: "This is terrible and I am considering legal action",
      });

      expect(result.isCrisis).toBe(true);
    });
  });
});
