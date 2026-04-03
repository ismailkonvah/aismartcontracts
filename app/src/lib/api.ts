import type { AuditRequest, AuditSummary, PublicAuditResult, Vulnerability } from '@/types/audit';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

interface AuditResponse {
  id: string;
  contractName: string;
  timestamp: number;
  summary: AuditSummary;
  vulnerabilities: Vulnerability[];
  duration: number;
}

export async function auditContract(request: AuditRequest): Promise<AuditResponse> {
  const response = await fetch(`${API_BASE_URL}/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Audit failed');
  }

  return response.json();
}

export async function quickAudit(request: AuditRequest): Promise<{
  summary: AuditSummary;
  vulnerabilities: Vulnerability[];
  timestamp: number;
}> {
  const response = await fetch(`${API_BASE_URL}/audit/quick`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Quick audit failed');
  }

  return response.json();
}

export async function getAuditHistory(): Promise<
  Array<{
    id: string;
    contractName: string;
    timestamp: number;
    summary: AuditSummary;
  }>
> {
  const response = await fetch(`${API_BASE_URL}/audit/history`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch audit history');
  }

  return response.json();
}

export async function getAudit(id: string): Promise<PublicAuditResult> {
  const response = await fetch(`${API_BASE_URL}/audit/${id}`);
  
  if (!response.ok) {
    throw new Error('Audit not found');
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  
  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}
