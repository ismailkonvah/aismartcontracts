import type { AuditSummary, Vulnerability } from '../../src/types/audit.js';
import { SEVERITY_WEIGHTS } from '../../src/types/audit.js';

export class RiskService {
  calculateRiskScore(vulnerabilities: Vulnerability[]): AuditSummary {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalScore = 0;

    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'Critical':
          counts.critical++;
          totalScore += SEVERITY_WEIGHTS.Critical;
          break;
        case 'High':
          counts.high++;
          totalScore += SEVERITY_WEIGHTS.High;
          break;
        case 'Medium':
          counts.medium++;
          totalScore += SEVERITY_WEIGHTS.Medium;
          break;
        case 'Low':
          counts.low++;
          totalScore += SEVERITY_WEIGHTS.Low;
          break;
      }
    }

    const totalIssues = vulnerabilities.length;
    const topConcerns = this.getTopConcerns(vulnerabilities);

    let riskLevel: AuditSummary['riskLevel'];
    if (counts.critical > 0 || totalScore >= 50) {
      riskLevel = 'Critical';
    } else if (counts.high >= 2 || totalScore >= 30) {
      riskLevel = 'Dangerous';
    } else if (counts.high === 1 || counts.medium >= 2 || totalScore >= 15) {
      riskLevel = 'Moderate';
    } else {
      riskLevel = 'Safe';
    }

    const normalizedScore = Math.min(100, Math.round((totalScore / 50) * 100));
    const riskDescription = this.getRiskDescription(riskLevel, topConcerns);

    return {
      totalIssues,
      criticalCount: counts.critical,
      highCount: counts.high,
      mediumCount: counts.medium,
      lowCount: counts.low,
      riskScore: normalizedScore,
      riskLevel,
      riskDescription,
      topConcerns,
    };
  }

  getRiskColor(riskLevel: AuditSummary['riskLevel']): string {
    const colors: Record<string, string> = {
      Safe: '#22c55e',
      Moderate: '#eab308',
      Dangerous: '#f97316',
      Critical: '#dc2626',
    };
    return colors[riskLevel] || '#6b7280';
  }

  getRiskDescription(riskLevel: AuditSummary['riskLevel'], topConcerns: string[] = []): string {
    const leadConcern = topConcerns[0];
    const descriptions: Record<string, string> = {
      Safe: leadConcern
        ? `Low immediate validator risk detected. Keep an eye on ${leadConcern.toLowerCase()} before shipping to a shared environment.`
        : 'Low immediate validator risk detected. The contract looks reasonable for further testing in GenLayer Studio.',
      Moderate: leadConcern
        ? `Some validator-facing or nondeterministic risk needs attention, especially around ${leadConcern.toLowerCase()}.`
        : 'Some validator-facing or nondeterministic risk needs attention before wider testing.',
      Dangerous: leadConcern
        ? `Multiple significant issues could weaken validator agreement or contract safety, especially around ${leadConcern.toLowerCase()}.`
        : 'Multiple significant issues could weaken validator agreement or contract safety.',
      Critical: leadConcern
        ? `Critical contract risk detected with serious concerns around ${leadConcern.toLowerCase()}. Do not rely on this logic without redesign and review.`
        : 'Critical contract risk detected. Do not rely on this logic without redesign and review.',
    };
    return descriptions[riskLevel] || 'Unable to determine risk level.';
  }

  private getTopConcerns(vulnerabilities: Vulnerability[]): string[] {
    const concernOrder = [
      { pattern: /equivalence|validator|nondetermin/i, label: 'validator agreement' },
      { pattern: /prompt|llm/i, label: 'prompt safety' },
      { pattern: /web data|http/i, label: 'external data trust' },
      { pattern: /access control|authorized/i, label: 'write access control' },
      { pattern: /unsafe python|eval|exec/i, label: 'unsafe Python execution' },
      { pattern: /state/i, label: 'state modeling' },
    ];

    const concerns: string[] = [];

    for (const concern of concernOrder) {
      if (vulnerabilities.some((vuln) => concern.pattern.test(vuln.title) || concern.pattern.test(vuln.description))) {
        concerns.push(concern.label);
      }
    }

    return concerns.slice(0, 3);
  }
}

export const riskService = new RiskService();
