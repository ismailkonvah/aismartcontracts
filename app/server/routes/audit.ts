import '../loadEnv.js';
import express from 'express';
import crypto from 'crypto';
import { contractAnalysisService } from '../services/contractAnalysisService.js';
import { geminiService } from '../services/geminiService.js';
import { riskService } from '../services/riskService.js';
import type { AuditRequest, AuditResult, PublicAuditResult } from '../../src/types/audit.js';

const router = express.Router();

// In-memory storage for audit history (replace with database in production)
const auditHistory: AuditResult[] = [];

function normalizeContractName(contractName: unknown): string {
  if (typeof contractName !== 'string') {
    return 'Contract';
  }

  const trimmed = contractName.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return 'Contract';
  }

  return trimmed.slice(0, 80);
}

function validateAuditRequest(body: AuditRequest, requireGenLayerMarkers: boolean): string | null {
  const { code } = body;

  if (!code || typeof code !== 'string') {
    return 'Contract code is required';
  }

  if (code.length > 100 * 1024) {
    return 'Contract code must be less than 100KB';
  }

  const looksLikeGenLayerContract =
    code.includes('from genlayer import') ||
    code.includes('gl.Contract') ||
    code.includes('@gl.public');

  if (requireGenLayerMarkers && !looksLikeGenLayerContract) {
    return 'Code does not appear to be a valid GenLayer Intelligent Contract';
  }

  return null;
}

function toPublicAuditResult(audit: AuditResult): PublicAuditResult {
  return {
    id: audit.id,
    contractName: audit.contractName,
    timestamp: audit.timestamp,
    summary: audit.summary,
    vulnerabilities: audit.vulnerabilities,
  };
}

// POST /api/audit - Analyze a contract
router.post('/', async (req, res) => {
  try {
    const request = req.body as AuditRequest;
    const contractName = normalizeContractName(request.contractName);
    const validationError = validateAuditRequest(request, true);

    if (validationError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: validationError,
      });
    }
    const { code } = request;

    console.log(`Starting audit for contract: ${contractName}`);
    const startTime = Date.now();

    // Step 1: Run contract analysis
    console.log('Running Intelligent Contract analysis...');
    let vulnerabilities = await contractAnalysisService.analyzeContract(code, contractName);
    console.log(`Found ${vulnerabilities.length} potential issues`);

    // Step 2: Enhance with LLM
    console.log('Enhancing with AI analysis...');
    vulnerabilities = await geminiService.analyzeVulnerabilities(code, vulnerabilities);

    // Step 3: Calculate risk score
    const summary = riskService.calculateRiskScore(vulnerabilities);

    // Create audit result
    const auditResult: AuditResult = {
      id: crypto.randomUUID(),
      contractCode: code,
      contractName,
      timestamp: Date.now(),
      summary,
      vulnerabilities,
    };

    // Store in history (keep last 100)
    auditHistory.unshift(auditResult);
    if (auditHistory.length > 100) {
      auditHistory.pop();
    }

    const duration = Date.now() - startTime;
    console.log(`Audit completed in ${duration}ms`);

    // Return result (exclude full code from response for size)
    const response: PublicAuditResult & { duration: number } = {
      ...toPublicAuditResult(auditResult),
      duration,
    };

    res.json(response);
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({
      error: 'Audit failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// GET /api/audit/history - Get recent audits
router.get('/history', (_req, res) => {
  // Return only metadata, not full code
  const history = auditHistory.map(audit => ({
    id: audit.id,
    contractName: audit.contractName,
    timestamp: audit.timestamp,
    summary: audit.summary,
  }));
  res.json(history);
});

// GET /api/audit/:id - Get specific audit
router.get('/:id', (req, res) => {
  const audit = auditHistory.find(a => a.id === req.params.id);
  if (!audit) {
    return res.status(404).json({ error: 'Audit not found' });
  }
  res.json(toPublicAuditResult(audit));
});

// POST /api/audit/quick - Quick analysis without LLM enhancement
router.post('/quick', async (req, res) => {
  try {
    const request = req.body as AuditRequest;
    const contractName = normalizeContractName(request.contractName);
    const validationError = validateAuditRequest(request, true);

    if (validationError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: validationError,
      });
    }
    const { code } = request;

    const vulnerabilities = await contractAnalysisService.analyzeContract(code, contractName);
    const summary = riskService.calculateRiskScore(vulnerabilities);

    res.json({
      summary,
      vulnerabilities,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Quick audit error:', error);
    res.status(500).json({
      error: 'Audit failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;
