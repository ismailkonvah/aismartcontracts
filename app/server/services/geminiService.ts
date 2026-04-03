import type { Vulnerability } from '../../src/types/audit.js';

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const geminiBaseUrl =
  process.env.GEMINI_BASE_URL ||
  'https://generativelanguage.googleapis.com/v1beta';

interface LLMResponse {
  explanation: string;
  riskDescription: string;
  suggestedFix: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class GeminiService {
  private hasConfiguredProvider: boolean;

  constructor() {
    this.hasConfiguredProvider = Boolean(geminiApiKey);
  }

  async analyzeVulnerabilities(
    code: string,
    vulnerabilities: Vulnerability[]
  ): Promise<Vulnerability[]> {
    if (!this.hasConfiguredProvider) {
      throw new Error(
        'Gemini API is not configured. Set GEMINI_API_KEY to use the full audit endpoint.'
      );
    }

    const enhancedVulnerabilities: Vulnerability[] = [];

    for (const vulnerability of vulnerabilities) {
      const enhanced = await this.enhanceVulnerability(code, vulnerability);
      enhancedVulnerabilities.push(enhanced);
    }

    return enhancedVulnerabilities;
  }

  private async enhanceVulnerability(
    code: string,
    vulnerability: Vulnerability
  ): Promise<Vulnerability> {
    const prompt = this.buildPrompt(code, vulnerability);

    const response = await fetch(
      `${geminiBaseUrl}/models/${geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const payload = (await response.json()) as GeminiGenerateContentResponse;

    if (!response.ok) {
      throw new Error(
        payload.error?.message || `Gemini request failed with status ${response.status}`
      );
    }

    const content = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim();

    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = this.parseLLMResponse(content);

    return {
      ...vulnerability,
      description: parsed.explanation || vulnerability.description,
      riskExplanation: parsed.riskDescription,
      suggestedFix: parsed.suggestedFix,
      severity: parsed.severity || vulnerability.severity,
    };
  }

  private buildPrompt(code: string, vulnerability: Vulnerability): string {
    return `Analyze the following GenLayer Intelligent Contract issue and provide a detailed explanation.

Contract Code:
\`\`\`python
${code}
\`\`\`

Detected Issue:
- Title: ${vulnerability.title}
- Severity: ${vulnerability.severity}
- Line Number: ${vulnerability.lineNumber || 'N/A'}
- Code Snippet: ${vulnerability.codeSnippet || 'N/A'}
- Initial Description: ${vulnerability.description}

Please provide your analysis in the following format:

EXPLANATION:
[Clear explanation of the vulnerability in plain English]

RISK:
[Description of the potential risk and impact]

SUGGESTED_FIX:
[Code suggestion to fix the issue, if applicable]

SEVERITY:
[Critical/High/Medium/Low/Info - confirm or adjust based on your analysis]`;
  }

  private parseLLMResponse(content: string): LLMResponse {
    const result: LLMResponse = {
      explanation: '',
      riskDescription: '',
      suggestedFix: '',
      severity: 'Medium',
    };

    const explanationMatch = content.match(
      /EXPLANATION:\s*([\s\S]*?)(?=RISK:|SUGGESTED_FIX:|SEVERITY:|$)/i
    );
    const riskMatch = content.match(
      /RISK:\s*([\s\S]*?)(?=EXPLANATION:|SUGGESTED_FIX:|SEVERITY:|$)/i
    );
    const fixMatch = content.match(
      /SUGGESTED_FIX:\s*([\s\S]*?)(?=EXPLANATION:|RISK:|SEVERITY:|$)/i
    );
    const severityMatch = content.match(
      /SEVERITY:\s*(Critical|High|Medium|Low|Info)/i
    );

    if (explanationMatch) {
      result.explanation = explanationMatch[1].trim();
    }
    if (riskMatch) {
      result.riskDescription = riskMatch[1].trim();
    }
    if (fixMatch) {
      result.suggestedFix = fixMatch[1].trim();
    }
    if (severityMatch) {
      result.severity = severityMatch[1] as LLMResponse['severity'];
    }

    return result;
  }
}

export const geminiService = new GeminiService();
