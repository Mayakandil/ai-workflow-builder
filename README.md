# Visual AI Workflow Builder

A visual YES/NO decision workflow editor built with **React Flow**, **FastAPI**, and **Inngest**. Create and connect decision nodes, execute a workflow in the background, and inspect the execution path directly on the canvas.

> **Demo mode:** The current decision function uses a mock AI response (`YES`) rather than calling a live AI model. The project demonstrates workflow orchestration and visualization, not real model inference.

## Features

- Visual drag-and-drop editor for AI decision nodes
- Editable prompts and YES/NO branching connections
- Workflow validation (one start node, no cycles, no duplicate branches, and no unreachable nodes)
- Background execution using FastAPI and Inngest
- Execution status polling, step-by-step logs, and visual highlighting of executed nodes and followed branches
- Save and load a workflow in browser `localStorage`
- Export and import workflows as JSON

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, React Flow (`@xyflow/react`) |
| Backend | Python, FastAPI |
| Background workflows | Inngest |
| Storage | Browser `localStorage` for saved editor graphs; in-memory backend execution status |
| AI decisions | Mock YES response (no paid API required) |

## Architecture

```text
React Flow editor (localhost:5173)
        |
        | POST /workflow/execute
        v
FastAPI backend (localhost:8000)
        |
        | workflow/execute event
        v
Inngest workflow runner (localhost:8288)
        |
        | Decision steps + execution history
        v
FastAPI GET /workflow/status/{run_id}
        |
        v
React Flow highlights executed nodes and followed YES/NO edges
```

## Getting Started

### Prerequisites

- Python 3.11+ (or a compatible Python version)
- Node.js and npm
- Inngest CLI (run using `npx`)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-workflow-builder.git
cd ai-workflow-builder
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Start the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

If `backend/requirements.txt` does not exist yet, generate it from the working backend environment before publishing (see **Preparing for GitHub** below).

Check the API at `http://localhost:8000/health` (expected: `{"status":"ok"}`).

### 3. Start Inngest

Open a second terminal in the project root:

```bash
npx inngest-cli@latest dev -u http://localhost:8000/api/inngest
```

Open the Inngest dashboard at `http://localhost:8288` and verify that the application is synced.

### 4. Start the frontend

Open a third terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## How to Use

1. Add decision nodes and edit their prompts.
2. Connect the **YES** and **NO** handles to downstream nodes.
3. Enter workflow input and click **Run AI Workflow**.
4. View status, execution logs, and highlighted executed nodes/branches.
5. Use **Save Workflow** / **Load Workflow** for browser-local persistence.
6. Use **Export JSON** / **Import JSON** to share or restore workflow definitions.

**Note:** The mock decision step currently always returns `YES`, regardless of the workflow input. A NO branch can be created in the editor, but will not be followed by the current mock executor.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/workflow/execute` | Submit a workflow for background execution; returns a run ID |
| GET | `/workflow/status/{run_id}` | Read execution status and history |
| GET | `/docs` | Interactive FastAPI API documentation |
| Inngest | `/api/inngest` | Inngest integration endpoint |

## Workflow JSON Format

```json
{
  "startNodeId": "1",
  "nodes": [
    { "id": "1", "prompt": "Is this a support request?" },
    { "id": "2", "prompt": "Is the request urgent?" }
  ],
  "edges": [
    { "source": "1", "target": "2", "sourceHandle": "yes" }
  ]
}
```

## Current Limitations

- **Mock AI only:** no live LLM call or semantic interpretation of prompts/input.
- **No database:** backend run status/history is stored in memory and may disappear on server restart.
- **Browser-local saves:** saved workflows are not synced across browsers or devices.
- **Local development setup:** the documented workflow runs on localhost and is not a production deployment.

## Preparing for GitHub

Make sure your repository has a `.gitignore` that excludes `backend/venv/`, `frontend/node_modules/`, `.env` files, and generated artifacts.

If the backend does not yet have a dependency list, activate its working virtual environment and run:

```bash
cd backend
source venv/bin/activate
pip freeze > requirements.txt
```

Review the generated dependencies before committing. Never commit real API keys or secrets.

## Project Status

The four core stages—setup, visual workflow editing, background execution, and execution visualization—are implemented. JSON import/export and browser-local save/load are additional features.
