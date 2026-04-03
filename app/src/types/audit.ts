export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  lineNumber?: number;
  codeSnippet?: string;
  suggestedFix?: string;
  riskExplanation?: string;
}

export interface AuditSummary {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  riskScore: number;
  riskLevel: 'Safe' | 'Moderate' | 'Dangerous' | 'Critical';
  riskDescription: string;
  topConcerns: string[];
}

export interface AuditResult {
  id: string;
  contractCode: string;
  contractName: string;
  timestamp: number;
  summary: AuditSummary;
  vulnerabilities: Vulnerability[];
  rawAnalysisOutput?: string;
}

export type PublicAuditResult = Omit<AuditResult, 'contractCode' | 'rawAnalysisOutput'>;

export interface AuditRequest {
  code: string;
  contractName?: string;
}

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  Critical: 10,
  High: 7,
  Medium: 4,
  Low: 1,
  Info: 0,
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-yellow-500 text-black',
  Low: 'bg-green-500 text-white',
  Info: 'bg-blue-500 text-white',
};

export const SEVERITY_BORDER_COLORS: Record<Severity, string> = {
  Critical: 'border-red-600',
  High: 'border-orange-500',
  Medium: 'border-yellow-500',
  Low: 'border-green-500',
  Info: 'border-blue-500',
};
