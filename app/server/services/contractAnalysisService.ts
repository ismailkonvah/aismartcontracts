import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import type { Severity, Vulnerability } from '../../src/types/audit.js';

const execFileAsync = promisify(execFile);

const VULNERABILITY_PATTERNS = [
  {
    pattern: /\beval\s*\(|\bexec\s*\(|subprocess\.|os\.system\(/gi,
    title: 'Unsafe Python Execution',
    severity: 'High' as Severity,
    description: 'Dynamic Python execution and shell access can undermine contract safety and reviewability.',
  },
  {
    pattern: /gl\.nondet\.web\.get|gl\.get_webpage/gi,
    title: 'External Web Data Dependency',
    severity: 'Medium' as Severity,
    description: 'Contract logic depends on off-chain web content, which needs careful nondeterministic handling and validation.',
  },
  {
    pattern: /gl\.nondet\.exec_prompt|gl\.exec_prompt/gi,
    title: 'LLM Prompt Execution',
    severity: 'Medium' as Severity,
    description: 'Prompt-based contract behavior should be constrained with structured output expectations and validator-aware checks.',
  },
  {
    pattern: /requests\.get|httpx\.get|urllib\.request/gi,
    title: 'Direct HTTP Client Usage',
    severity: 'High' as Severity,
    description: 'Direct Python HTTP calls bypass GenLayer-specific nondeterministic workflows and make consensus assumptions harder to reason about.',
  },
  {
    pattern: /except\s+Exception\s*:\s*pass/gi,
    title: 'Silent Exception Handling',
    severity: 'Low' as Severity,
    description: 'Suppressing unexpected errors can hide important contract failures and make debugging or auditing harder.',
  },
];

export class ContractAnalysisService {
  private tempDir: string;
  private useLegacyExternalAnalyzer: boolean;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'ai-smart-contract-auditor');
    this.useLegacyExternalAnalyzer = process.env.USE_REAL_SLITHER === 'true';
  }

  async analyzeContract(code: string, contractName: string = 'Contract'): Promise<Vulnerability[]> {
    if (this.useLegacyExternalAnalyzer) {
      try {
        return await this.runLegacyExternalAnalyzer(code, contractName);
      } catch (error) {
        console.warn('Legacy external analyzer failed, falling back to GenLayer mock analysis:', error);
      }
    }

    return this.runMockAnalysis(code);
  }

  private async runLegacyExternalAnalyzer(code: string, contractName: string): Promise<Vulnerability[]> {
    await fs.mkdir(this.tempDir, { recursive: true });
    const workingDir = await fs.mkdtemp(path.join(this.tempDir, 'audit-'));
    const tempFile = path.join(workingDir, `${this.toSafeFilename(contractName)}.py`);
    await fs.writeFile(tempFile, code, 'utf-8');

    try {
      const { stdout } = await execFileAsync('slither', [tempFile, '--json', '-'], {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const analyzerOutput = JSON.parse(stdout);
      return this.parseExternalAnalyzerOutput(analyzerOutput, code);
    } finally {
      await fs.rm(workingDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private parseExternalAnalyzerOutput(output: ExternalAnalyzerOutput, code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const lines = code.split('\n');

    if (output.results?.detectors) {
      for (const detector of output.results.detectors) {
        const lineNumber = detector.elements?.[0]?.line || 0;
        const codeSnippet = lines[lineNumber - 1]?.trim() || '';

        vulnerabilities.push({
          id: `SLITHER-${detector.check}`,
          title: detector.description?.split('.')[0] || detector.check,
          severity: this.mapExternalAnalyzerImpact(detector.impact),
          description: detector.description || 'No description available',
          lineNumber,
          codeSnippet,
        });
      }
    }

    return vulnerabilities;
  }

  private mapExternalAnalyzerImpact(impact: string): Severity {
    const impactMap: Record<string, Severity> = {
      High: 'Critical',
      Medium: 'High',
      Low: 'Medium',
      Informational: 'Low',
    };
    return impactMap[impact] || 'Info';
  }

  private runMockAnalysis(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const lines = code.split('\n');
    const foundIssues = new Set<string>();

    for (const pattern of VULNERABILITY_PATTERNS) {
      pattern.pattern.lastIndex = 0;

      let match;
      while ((match = pattern.pattern.exec(code)) !== null) {
        const codeBeforeMatch = code.substring(0, match.index);
        const lineNumber = codeBeforeMatch.split('\n').length;
        const codeSnippet = lines[lineNumber - 1]?.trim() || '';
        const issueKey = `${pattern.title}-${lineNumber}`;

        if (foundIssues.has(issueKey)) continue;
        foundIssues.add(issueKey);

        vulnerabilities.push({
          id: `MOCK-${vulnerabilities.length + 1}`,
          title: pattern.title,
          severity: pattern.severity,
          description: pattern.description,
          lineNumber,
          codeSnippet,
        });
      }
    }

    this.checkAdditionalPatterns(code, lines, vulnerabilities, foundIssues);

    return vulnerabilities;
  }

  private checkAdditionalPatterns(
    code: string,
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    this.checkMissingVersionHeader(lines, vulnerabilities, foundIssues);
    this.checkMissingEquivalenceValidation(code, lines, vulnerabilities, foundIssues);
    this.checkUnstructuredPromptUsage(code, lines, vulnerabilities, foundIssues);
    this.checkPrivilegedWriteMethods(lines, vulnerabilities, foundIssues);
    this.checkWeakStateTyping(lines, vulnerabilities, foundIssues);
    this.checkUndeclaredStateWrites(lines, vulnerabilities, foundIssues);
    this.checkUnsupportedPersistentFieldTypes(lines, vulnerabilities, foundIssues);
  }

  private checkMissingVersionHeader(
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);
    if (firstNonEmptyIndex === -1) {
      return;
    }

    const firstNonEmptyLine = lines[firstNonEmptyIndex].trim();
    const hasVersionHeader = /^#\s*\{\s*"Depends"\s*:\s*"py-genlayer:[^"]+"\s*\}/.test(firstNonEmptyLine);

    if (hasVersionHeader) {
      return;
    }

    const issueKey = `Missing-Version-Header-${firstNonEmptyIndex + 1}`;
    if (foundIssues.has(issueKey)) {
      return;
    }

    foundIssues.add(issueKey);
    vulnerabilities.push({
      id: `MOCK-${vulnerabilities.length + 1}`,
      title: 'Missing GenVM Version Header',
      severity: 'Low',
      description: 'GenLayer contracts should start with a version header such as `# { "Depends": "py-genlayer:test" }` so the runtime target is explicit.',
      lineNumber: firstNonEmptyIndex + 1,
      codeSnippet: lines[firstNonEmptyIndex].trim(),
    });
  }

  private checkMissingEquivalenceValidation(
    code: string,
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    const usesNondeterminism =
      /gl\.nondet\.web\.get|gl\.get_webpage|gl\.nondet\.exec_prompt|gl\.exec_prompt/i.test(code);
    const hasEquivalence =
      /gl\.eq_principle|eq_principle|run_nondet_unsafe/i.test(code);

    if (!usesNondeterminism || hasEquivalence) {
      return;
    }

    const lineIndex = lines.findIndex((line) =>
      /gl\.nondet\.web\.get|gl\.get_webpage|gl\.nondet\.exec_prompt|gl\.exec_prompt/i.test(line)
    );

    if (lineIndex === -1) {
      return;
    }

    const issueKey = `Missing-Equivalence-${lineIndex + 1}`;
    if (foundIssues.has(issueKey)) {
      return;
    }

    foundIssues.add(issueKey);
    vulnerabilities.push({
      id: `MOCK-${vulnerabilities.length + 1}`,
      title: 'Missing Equivalence Validation',
      severity: 'High',
      description: 'Nondeterministic operations should usually be wrapped with an equivalence principle or equivalent validator-aware reconciliation strategy.',
      lineNumber: lineIndex + 1,
      codeSnippet: lines[lineIndex].trim(),
    });
  }

  private checkUnstructuredPromptUsage(
    code: string,
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    const usesPrompt = /gl\.nondet\.exec_prompt|gl\.exec_prompt/i.test(code);
    const requestsStructuredOutput = /json|JSON|structured/i.test(code);
    const parsesStructuredOutput = /json\.loads|pydantic|TypedDict|BaseModel/i.test(code);

    if (!usesPrompt || requestsStructuredOutput || parsesStructuredOutput) {
      return;
    }

    const lineIndex = lines.findIndex((line) => /gl\.nondet\.exec_prompt|gl\.exec_prompt/i.test(line));
    if (lineIndex === -1) {
      return;
    }

    const issueKey = `Unstructured-Prompt-${lineIndex + 1}`;
    if (foundIssues.has(issueKey)) {
      return;
    }

    foundIssues.add(issueKey);
    vulnerabilities.push({
      id: `MOCK-${vulnerabilities.length + 1}`,
      title: 'Unstructured LLM Output',
      severity: 'Medium',
      description: 'Prompt results should be constrained to a structured schema so downstream state updates stay auditable and predictable.',
      lineNumber: lineIndex + 1,
      codeSnippet: lines[lineIndex].trim(),
    });
  }

  private checkPrivilegedWriteMethods(
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    const privilegedMethodPattern =
      /^\s*def\s+(resolve|set|update|configure|withdraw|upgrade|admin|mint|burn)\w*\s*\(/i;
    const authPattern = /\b(owner|caller|sender|admin|authorized|assert|raise Exception\("Not authorized"\)|PermissionError)\b/i;

    for (let index = 0; index < lines.length; index++) {
      if (!/@gl\.public\.write/.test(lines[index])) {
        continue;
      }

      const methodLineIndex = index + 1;
      const methodLine = lines[methodLineIndex] || '';
      if (!privilegedMethodPattern.test(methodLine)) {
        continue;
      }

      const bodyWindow = lines.slice(methodLineIndex, methodLineIndex + 12).join('\n');
      if (authPattern.test(bodyWindow)) {
        continue;
      }

      const issueKey = `Missing-Access-Control-${methodLineIndex + 1}`;
      if (foundIssues.has(issueKey)) {
        continue;
      }

      foundIssues.add(issueKey);
      vulnerabilities.push({
        id: `MOCK-${vulnerabilities.length + 1}`,
        title: 'Missing Access Control',
        severity: 'Medium',
        description: 'Public write methods that resolve, configure, or update contract state should have explicit authorization checks when they are meant to be privileged.',
        lineNumber: methodLineIndex + 1,
        codeSnippet: methodLine.trim(),
      });
    }
  }

  private checkWeakStateTyping(
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    const classIndex = lines.findIndex((line) => /class\s+\w+\s*\(\s*gl\.Contract\s*\)/.test(line));
    if (classIndex === -1) {
      return;
    }

    const hasTypedState = lines.slice(classIndex + 1, classIndex + 8).some((line) => /^\s+\w+\s*:\s*.+$/.test(line));
    if (hasTypedState) {
      return;
    }

    const issueKey = `Weak-State-Typing-${classIndex + 1}`;
    if (foundIssues.has(issueKey)) {
      return;
    }

    foundIssues.add(issueKey);
    vulnerabilities.push({
      id: `MOCK-${vulnerabilities.length + 1}`,
      title: 'Weak Contract State Modeling',
      severity: 'Low',
      description: 'Adding clear typed state fields makes Intelligent Contracts easier to reason about and safer to maintain.',
      lineNumber: classIndex + 1,
      codeSnippet: lines[classIndex].trim(),
    });
  }

  private checkUndeclaredStateWrites(
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    const classIndex = lines.findIndex((line) => /class\s+\w+\s*\(\s*gl\.Contract\s*\)/.test(line));
    if (classIndex === -1) {
      return;
    }

    const declaredFields = new Set(
      lines
        .slice(classIndex + 1)
        .map((line) => line.match(/^\s+([A-Za-z_]\w*)\s*:\s*.+$/)?.[1])
        .filter((value): value is string => Boolean(value))
    );

    for (const [index, line] of lines.entries()) {
      const match = line.match(/self\.([A-Za-z_]\w*)\s*=/);
      if (!match) {
        continue;
      }

      const fieldName = match[1];
      if (declaredFields.has(fieldName)) {
        continue;
      }

      const issueKey = `Undeclared-State-Write-${index + 1}-${fieldName}`;
      if (foundIssues.has(issueKey)) {
        continue;
      }

      foundIssues.add(issueKey);
      vulnerabilities.push({
        id: `MOCK-${vulnerabilities.length + 1}`,
        title: 'Undeclared Persistent State',
        severity: 'Medium',
        description: 'The contract writes to a `self.` field that is not clearly declared in the contract state model. GenLayer examples typically declare persistent fields explicitly near the contract definition.',
        lineNumber: index + 1,
        codeSnippet: line.trim(),
      });
    }
  }

  private checkUnsupportedPersistentFieldTypes(
    lines: string[],
    vulnerabilities: Vulnerability[],
    foundIssues: Set<string>
  ): void {
    const persistentFieldPattern = /^\s+([A-Za-z_]\w*)\s*:\s*(list\[.+\]|dict\[.+\]|int)\s*$/;

    for (const [index, line] of lines.entries()) {
      const match = line.match(persistentFieldPattern);
      if (!match) {
        continue;
      }

      const [, fieldName, fieldType] = match;
      const issueKey = `Unsupported-Persistent-Field-${index + 1}-${fieldName}`;
      if (foundIssues.has(issueKey)) {
        continue;
      }

      let recommendation = 'Use an explicitly supported persistent type.';
      if (fieldType.startsWith('list[')) {
        recommendation = 'Use `DynArray[...]` for persisted arrays.';
      } else if (fieldType.startsWith('dict[')) {
        recommendation = 'Use `TreeMap[..., ...]` for persisted mappings.';
      } else if (fieldType === 'int') {
        recommendation = 'Use a fixed-size integer such as `i32` or `u256`, or `bigint` if you truly need arbitrary-size integers.';
      }

      foundIssues.add(issueKey);
      vulnerabilities.push({
        id: `MOCK-${vulnerabilities.length + 1}`,
        title: 'Unsupported Persistent Field Type',
        severity: 'Medium',
        description: `Persistent field \`${fieldName}\` uses \`${fieldType}\`, which is not the recommended persisted type shape for GenLayer contracts. ${recommendation}`,
        lineNumber: index + 1,
        codeSnippet: line.trim(),
      });
    }
  }

  private toSafeFilename(contractName: string): string {
    const sanitized = contractName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    return sanitized || 'Contract';
  }
}

interface ExternalAnalyzerDetector {
  check: string;
  impact: string;
  description?: string;
  elements?: Array<{
    line?: number;
  }>;
}

interface ExternalAnalyzerOutput {
  results?: {
    detectors?: ExternalAnalyzerDetector[];
  };
}

export const contractAnalysisService = new ContractAnalysisService();
