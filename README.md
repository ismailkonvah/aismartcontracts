# GenLayer Intelligent Contract Auditor

GenLayer Intelligent Contract Auditor is a hackathon MVP for reviewing **GenLayer Intelligent Contracts** instead of generic Solidity contracts.

It is designed around the actual GenLayer development flow:

- Python-based Intelligent Contracts
- GenVM-style nondeterministic operations
- web access and LLM-backed flows
- development and testing alongside **GenLayer Studio**

Official references:

- [GenLayer Developers Docs](https://docs.genlayer.com/developers)
- [GenLayer Studio](https://studio.genlayer.com/)

## What This MVP Does

- Paste or upload a Python Intelligent Contract
- Run a static contract review from the UI or API
- Flag risky patterns around nondeterminism, prompts, web access, unsafe Python execution, and weak write-method controls
- Generate a GenLayer-oriented risk summary and finding list
- Add real Gemini explanations and suggested fixes on the full audit route

## Why This Pivot

GenLayer Intelligent Contracts are not standard Solidity contracts. The official developer docs describe them as Python-based contracts built around GenVM concepts, nondeterministic blocks, and tooling such as GenLayer Studio. This app now reflects that direction instead of presenting itself as an EVM-first auditor.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Express, TypeScript
- AI: Google Gemini API
- Analysis: GenLayer-oriented heuristic review with optional local `USE_REAL_SLITHER` fallback retained internally for experimentation only

## Current Status

The project currently passes:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

The backend API was also smoke-tested successfully with:

- `GET /api/health`
- `POST /api/audit`

## Local Setup

### Prerequisites

- Node.js 18+
- npm

Optional:

- Gemini API key for real AI explanations on the full audit route
- local Python tooling if you want to experiment with external analysis paths

### Install

```bash
cd app
npm install
```

### Run the frontend

```bash
cd app
npm run dev
```

Frontend:

- `http://localhost:5173`

### Run the backend

```bash
cd app
npm run build:server
npm run server
```

Backend:

- `http://localhost:3001`

### Production-style run

```bash
cd app
npm run build
npm run server
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Enables real Gemini explanations and fix suggestions | No |
| `GEMINI_MODEL` | Gemini model name, default `gemini-2.5-flash` | No |
| `PORT` | Backend port, default `3001` | No |
| `VITE_API_URL` | Frontend API base URL, default `http://localhost:3001/api` | No |
| `USE_REAL_SLITHER` | Optional legacy switch for local experimentation | No |

## How To Use

### In the UI

1. Start the frontend and backend
2. Open `http://localhost:5173`
3. Paste a Python Intelligent Contract or upload a `.py` file
4. Optionally load one of the included GenLayer-style samples
5. Click `Run AI Audit`
6. Review the risk score, top concerns, and detailed findings

### With the API

Health check:

```bash
curl http://localhost:3001/api/health
```

Run an audit:

```bash
curl -X POST http://localhost:3001/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "NewsResolutionContract",
    "code": "from genlayer import *\n\nclass NewsResolutionContract(gl.Contract):\n    @gl.public.view\n    def ping(self) -> str:\n        return \"ok\""
  }'
```

Quick audit:

```bash
curl -X POST http://localhost:3001/api/audit/quick \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "NewsResolutionContract",
    "code": "from genlayer import *\n\nclass NewsResolutionContract(gl.Contract):\n    @gl.public.view\n    def ping(self) -> str:\n        return \"ok\""
  }'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | `GET` | Health check |
| `/api/audit` | `POST` | Full audit with real Gemini enhancement |
| `/api/audit/quick` | `POST` | Static review without AI enhancement |
| `/api/audit/history` | `GET` | Recent audit metadata |
| `/api/audit/:id` | `GET` | Single audit result without contract source |

## Review Areas

This MVP currently looks for patterns such as:

- missing equivalence validation around nondeterministic operations
- unstructured LLM output handling
- missing GenVM version headers
- undeclared or weakly modeled persistent state
- unsafe Python execution like `eval`, `exec`, or shell calls
- direct HTTP usage outside GenLayer-style nondeterministic flows
- public write methods that appear privileged but lack obvious access control
- unsupported persistent field types

## Security Notes

- Audit history endpoints do not expose stored source code
- Audit IDs use random UUIDs
- Input is limited to 100KB
- The app does not execute uploaded code directly
- Results are advisory and heuristic, not protocol-guaranteed

## Limitations

- This is still an MVP and the analyzer is heuristic-based
- Findings may include false positives or miss GenLayer-specific design flaws
- Prompt and web-based contract logic still need careful human review
- The optional legacy `USE_REAL_SLITHER` path is not the primary GenLayer analysis model
- The full `/api/audit` route requires a real Gemini API key; use `/api/audit/quick` if you want non-AI analysis only

## Demo Tips

For a strong hackathon demo:

1. Load `Vulnerable Resolver`
2. Show findings around nondeterminism, prompt handling, and external data trust
3. Load `Verified Resolver`
4. Contrast structured output, declared state, and equivalence-backed handling
5. Mention that the tool is aligned to GenLayer docs and Studio workflows, not generic Solidity scanning
6. Point out that the full audit adds Gemini-generated explanations while the quick audit stays rule-based

## Project Structure

```text
app/
  server/
    index.ts
    routes/
    services/
  src/
    components/
    hooks/
    lib/
    types/
```

## Disclaimer

This tool is for educational, prototyping, and hackathon use. It does not guarantee the correctness, safety, or validator compatibility of an Intelligent Contract and should not replace careful testing and expert review.
