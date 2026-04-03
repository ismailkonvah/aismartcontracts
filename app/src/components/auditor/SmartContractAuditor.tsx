import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Shield,
  History,
  FileSearch,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { RiskDashboard } from './RiskDashboard';
import { VulnerabilityList } from './VulnerabilityList';
import { auditContract } from '@/lib/api';
import type { AuditSummary, Vulnerability } from '@/types/audit';
import { toast } from 'sonner';

interface AuditResult {
  id: string;
  contractName: string;
  timestamp: number;
  summary: AuditSummary;
  vulnerabilities: Vulnerability[];
  duration: number;
}

export function SmartContractAuditor() {
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'results'>('editor');
  const [editorResetVersion, setEditorResetVersion] = useState(0);

  const handleNewAudit = useCallback(() => {
    setCode('');
    setResult(null);
    setError(null);
    setActiveTab('editor');
    setEditorResetVersion((current) => current + 1);
  }, []);

  const handleAudit = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please enter contract code');
      return;
    }

    const looksLikeGenLayerContract =
      code.includes('from genlayer import') ||
      code.includes('gl.Contract') ||
      code.includes('@gl.public');

    if (!looksLikeGenLayerContract) {
      toast.error('Invalid GenLayer contract', {
        description:
          'Code should include GenLayer contract markers such as "from genlayer import *", "gl.Contract", or "@gl.public"',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const contractMatch = code.match(/class\s+(\w+)\s*\(\s*gl\.Contract\s*\)/);
      const contractName = contractMatch ? contractMatch[1] : 'Contract';

      const response = await auditContract({
        code,
        contractName,
      });

      setResult(response);
      setActiveTab('results');
      toast.success('Audit completed!', {
        description: `Found ${response.summary.totalIssues} findings in ${response.duration}ms`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audit failed';
      setError(errorMessage);
      toast.error('Audit failed', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                  GenLayer Intelligent Contract Auditor
                </h1>
                <p className="text-xs text-slate-400 sm:text-xs">
                  GenLayer-aware review with Gemini-enhanced explanations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 self-start sm:self-auto">
              <a
                href="https://studio.genlayer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
              >
                <Sparkles className="w-4 h-4" />
                GenLayer Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Alert className="bg-yellow-950/30 border-yellow-800/50">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <AlertTitle className="text-yellow-400">Important Disclaimer</AlertTitle>
          <AlertDescription className="text-yellow-300/80 text-sm">
            This is an AI-assisted review tool for GenLayer Intelligent Contracts. It is
            useful for early security and design feedback, but it does not replace
            protocol-specific testing, validator-aware review, or professional auditing.
          </AlertDescription>
        </Alert>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'editor' | 'results')}
          className="space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-1 border border-slate-700 bg-slate-800/50 sm:grid-cols-2">
            <TabsTrigger
              value="editor"
              className="w-full justify-center px-3 py-2 text-center data-[state=active]:bg-slate-700 data-[state=active]:text-slate-200"
            >
              <FileSearch className="w-4 h-4 mr-2" />
              Contract Editor
            </TabsTrigger>
            <TabsTrigger
              value="results"
              disabled={!result}
              className="w-full justify-center px-3 py-2 text-center data-[state=active]:bg-slate-700 data-[state=active]:text-slate-200"
            >
              <Shield className="w-4 h-4 mr-2" />
              Audit Results
              {result && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    result.summary.riskLevel === 'Safe'
                      ? 'bg-green-600'
                      : result.summary.riskLevel === 'Moderate'
                        ? 'bg-yellow-600'
                        : result.summary.riskLevel === 'Dangerous'
                          ? 'bg-orange-600'
                          : 'bg-red-600'
                  } text-white`}
                >
                  {result.summary.totalIssues}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:min-h-[calc(100vh-280px)]">
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 min-h-[520px] lg:min-h-0">
                <CodeEditor
                  key={editorResetVersion}
                  code={code}
                  onChange={setCode}
                  onSubmit={handleAudit}
                  isLoading={isLoading}
                />
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">
                    How It Works
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-200">Static Analysis</h4>
                        <p className="text-sm text-slate-400">
                          The backend reviews Python-based GenLayer contracts for risky
                          nondeterministic logic, weak prompt handling, unsafe Python usage,
                          and web-data pitfalls.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-200">AI Explanations</h4>
                        <p className="text-sm text-slate-400">
                          Gemini turns raw findings into clearer explanations, validator-aware
                          risk context, and safer implementation suggestions.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-200">Risk Summary</h4>
                        <p className="text-sm text-slate-400">
                          Findings are grouped into a simple score to help you triage
                          validator-facing risk, trust assumptions, and deployment readiness.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">
                    Review Areas
                  </h3>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Missing equivalence
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Unsafe Python
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      Weak prompt design
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      Public write controls
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Web data trust
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Version headers
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Persistent field types
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      State modeling
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    Checks are tuned for documented GenLayer contract patterns, including
                    explicit GenVM version headers, declared persistent fields, and
                    validator-aware nondeterministic flows.
                  </p>
                </div>

                {error && (
                  <Alert className="bg-red-950/30 border-red-800/50">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <AlertTitle className="text-red-400">Audit Failed</AlertTitle>
                    <AlertDescription className="text-red-300/80 text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {result ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-slate-200 sm:text-3xl">
                      Audit Results
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      <span className="block sm:inline">{result.contractName}</span>
                      <span className="hidden sm:inline"> | </span>
                      <span className="block sm:inline">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                      <span className="hidden sm:inline"> | </span>
                      <span className="block sm:inline">completed in {result.duration}ms</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleNewAudit}
                    className="w-full border-slate-600 text-slate-300 sm:w-auto"
                  >
                    <FileSearch className="w-4 h-4 mr-2" />
                    New Audit
                  </Button>
                </div>

                <RiskDashboard summary={result.summary} />
                <VulnerabilityList vulnerabilities={result.vulnerabilities} />
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400">
                  No audit results yet
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Run an audit to see results here
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Built with <span className="text-slate-400">GenLayer concepts</span>,{' '}
              <span className="text-slate-400">Gemini</span>, and{' '}
              <span className="text-slate-400">React</span>
            </p>
            <p>Use alongside Studio testing and human review</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
