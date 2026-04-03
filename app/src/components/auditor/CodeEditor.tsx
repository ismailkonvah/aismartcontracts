import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileCode, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { sampleContracts } from '@/lib/sampleContracts';
import { toast } from 'sonner';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function CodeEditor({ 
  code, 
  onChange, 
  onSubmit, 
  isLoading, 
  disabled,
}: CodeEditorProps) {
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 100 * 1024) {
        toast.error('File too large', {
          description: 'Maximum file size is 100KB',
        });
        return;
      }

      if (!file.name.endsWith('.py')) {
        toast.error('Invalid file type', {
          description: 'Please upload a .py Intelligent Contract file',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onChange(content);
        toast.success('File loaded', {
          description: `${file.name} loaded successfully`,
        });
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsText(file);
    },
    [onChange]
  );

  const handleSampleSelect = useCallback(
    (sampleName: string) => {
      const sample = sampleContracts.find((s) => s.name === sampleName);
      if (sample) {
        onChange(sample.code);
        setSelectedSample(sampleName);
        toast.info(`Loaded ${sample.name}`, {
          description: sample.description,
        });
      }
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange('');
    setSelectedSample('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [code]);

  const isValidCode =
    code.includes('from genlayer import') ||
    code.includes('gl.Contract') ||
    code.includes('@gl.public');
  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-slate-200">Intelligent Contract</span>
          {isValidCode && (
            <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Sample selector */}
          <select
            value={selectedSample}
            onChange={(e) => handleSampleSelect(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
            disabled={disabled || isLoading}
          >
            <option value="">Load GenLayer sample...</option>
            {sampleContracts.map((sample) => (
              <option key={sample.name} value={sample.name}>
                {sample.name}
              </option>
            ))}
          </select>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".py"
            onChange={handleFileUpload}
            className="hidden"
            disabled={disabled || isLoading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 sm:w-auto"
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>

          {/* Copy button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!code || disabled || isLoading}
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 sm:w-auto"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>

          {/* Clear button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!code || disabled || isLoading}
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-red-400 sm:w-auto"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <Textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`# Paste your GenLayer Intelligent Contract here...
# Example:
# { "Depends": "py-genlayer:test" }
from genlayer import *

class MyContract(gl.Contract):
    value: str

    def __init__(self):
        self.value = "hello"

    @gl.public.view
    def read_value(self) -> str:
        return self.value`}
          className="w-full h-full resize-none font-mono text-sm bg-slate-900 text-slate-300 border-0 focus:ring-0 p-4 leading-relaxed"
          disabled={disabled || isLoading}
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      <div className="flex flex-col gap-3 border-t border-slate-700 bg-slate-800 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span>{lineCount} lines</span>
          <span>{charCount} characters</span>
          {!isValidCode && code.length > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <AlertCircle className="w-3 h-3" />
              Missing GenLayer contract markers
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onSubmit}
            disabled={!isValidCode || isLoading || disabled}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <FileCode className="w-4 h-4 mr-2" />
                Run AI Audit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
