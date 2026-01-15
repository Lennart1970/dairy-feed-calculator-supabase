import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseLabReportPdf, uploadPdfForProcessing, type ParseResult } from "./pdfParser";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

describe("PDF Parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadPdfForProcessing", () => {
    it("should upload PDF and return URL", async () => {
      const mockUrl = "https://storage.example.com/lab-reports/test.pdf";
      vi.mocked(storagePut).mockResolvedValue({ key: "test-key", url: mockUrl });

      const buffer = Buffer.from("test pdf content");
      const result = await uploadPdfForProcessing(buffer, "test-report.pdf");

      expect(result).toBe(mockUrl);
      expect(storagePut).toHaveBeenCalledWith(
        expect.stringMatching(/^lab-reports\/\d+-test-report\.pdf$/),
        buffer,
        "application/pdf"
      );
    });

    it("should sanitize filename with special characters", async () => {
      const mockUrl = "https://storage.example.com/lab-reports/test.pdf";
      vi.mocked(storagePut).mockResolvedValue({ key: "test-key", url: mockUrl });

      const buffer = Buffer.from("test pdf content");
      await uploadPdfForProcessing(buffer, "Kuil 1 gras (2024).pdf");

      expect(storagePut).toHaveBeenCalledWith(
        expect.stringMatching(/^lab-reports\/\d+-Kuil_1_gras__2024_\.pdf$/),
        buffer,
        "application/pdf"
      );
    });
  });

  describe("parseLabReportPdf", () => {
    it("should successfully parse a valid lab report response", async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              productName: "Graskuil",
              productType: "1e snede",
              vem: 951,
              dve: 76,
              oeb: 28,
              dsPercent: 41,
              sw: 2.85,
              rawProtein: 168,
              rawFiber: 238,
              sugar: 78,
              starch: 0
            })
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockLLMResponse as any);

      const result = await parseLabReportPdf("https://example.com/test.pdf");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.productName).toBe("Graskuil");
      expect(result.data?.vem).toBe(951);
      expect(result.data?.dve).toBe(76);
      expect(result.data?.oeb).toBe(28);
      expect(result.data?.dsPercent).toBe(41);
      expect(result.data?.sw).toBe(2.85);
    });

    it("should handle markdown code blocks in LLM response", async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: "```json\n" + JSON.stringify({
              productName: "Snijmaïs",
              productType: "Oogst 2024",
              vem: 987,
              dve: 52,
              oeb: -42,
              dsPercent: 35,
              sw: 1.65,
              rawProtein: 72,
              rawFiber: 192,
              sugar: 12,
              starch: 342
            }) + "\n```"
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockLLMResponse as any);

      const result = await parseLabReportPdf("https://example.com/test.pdf");

      expect(result.success).toBe(true);
      expect(result.data?.productName).toBe("Snijmaïs");
      expect(result.data?.oeb).toBe(-42);
      expect(result.data?.starch).toBe(342);
    });

    it("should normalize DS% from g/kg to percentage", async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              productName: "Graskuil",
              productType: "2e snede",
              vem: 864,
              dve: 63,
              oeb: 5,
              dsPercent: 400, // Given in g/kg
              sw: 3.1
            })
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockLLMResponse as any);

      const result = await parseLabReportPdf("https://example.com/test.pdf");

      expect(result.success).toBe(true);
      expect(result.data?.dsPercent).toBe(40); // Should be normalized to 40%
    });

    it("should return error when LLM response has no content", async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockLLMResponse as any);

      const result = await parseLabReportPdf("https://example.com/test.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Geen geldige response van LLM ontvangen");
    });

    it("should return error when LLM response is not valid JSON", async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: "This is not valid JSON"
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockLLMResponse as any);

      const result = await parseLabReportPdf("https://example.com/test.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Kon de LLM response niet als JSON parsen");
    });

    it("should return error when parsed data is incomplete", async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              productName: "Graskuil",
              // Missing vem and dve
              oeb: 28,
              dsPercent: 41,
              sw: 2.85
            })
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockLLMResponse as any);

      const result = await parseLabReportPdf("https://example.com/test.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Onvolledige data geëxtraheerd uit het rapport");
    });

    it("should handle LLM invocation errors", async () => {
      vi.mocked(invokeLLM).mockRejectedValue(new Error("LLM service unavailable"));

      const result = await parseLabReportPdf("https://example.com/test.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("LLM service unavailable");
    });
  });
});
