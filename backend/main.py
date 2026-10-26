
import os
import inngest
import inngest.fast_api

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, model_validator
from uuid import uuid4
from workflow import workflow_runs

load_dotenv()

from workflow import create_workflow_function

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

inngest_client = inngest.Inngest(
    app_id="ai-workflow-builder",
    is_production=False,
)

class Node(BaseModel):
    id: str
    prompt: str

class Edge(BaseModel):
    source: str
    target: str
    sourceHandle: str

class Workflow(BaseModel):
    startNodeId: str
    nodes: list[Node]
    edges: list[Edge]

    @model_validator(mode="after")
    def validate_graph(self):
        ids = {node.id for node in self.nodes}

        if len(ids) != len(self.nodes):
            raise ValueError("Duplicate node IDs")

        if self.startNodeId not in ids:
            raise ValueError("Invalid starting node")

        if any(not n.prompt.strip() for n in self.nodes):
            raise ValueError("Empty node prompt")

        branches = set()
        for edge in self.edges:
            if edge.source not in ids or edge.target not in ids:
                raise ValueError("Invalid edge node")
            if edge.sourceHandle not in ("yes", "no"):
                raise ValueError("Invalid branch")

            branch = (edge.source, edge.sourceHandle)
            if branch in branches:
                raise ValueError("Duplicate branch")
            branches.add(branch)

        return self

class ExecuteRequest(BaseModel):
    workflow: Workflow
    input: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/workflow/execute", status_code=202)
async def start_workflow(request: ExecuteRequest):
    run_id = str(uuid4())

    workflow_runs[run_id] = {
        "status": "pending",
        "history": []
    }

    await inngest_client.send(
        inngest.Event(
            name="workflow/execute",
            data={
                **request.model_dump(),
                "run_id": run_id
            }
        )
    )

    return {
        "status": "accepted",
        "run_id": run_id
    }
@app.get("/workflow/status/{run_id}")
async def get_workflow_status(run_id: str):
    if run_id not in workflow_runs:
        raise HTTPException(
            status_code=404,
            detail="Workflow run not found"
        )

    return workflow_runs[run_id]

execute_workflow = create_workflow_function(inngest_client)

inngest.fast_api.serve(
    app,
    inngest_client,
    [execute_workflow],
)
