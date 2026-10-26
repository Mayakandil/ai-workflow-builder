import os
import inngest
from pathlib import Path
from dotenv import load_dotenv


# Load environment variables
load_dotenv(Path(__file__).resolve().parent / ".env")

# Store workflow execution results
workflow_runs = {}


def create_workflow_function(inngest_client):

    @inngest_client.create_function(
        fn_id="execute-ai-workflow",
        trigger=inngest.TriggerEvent(
            event="workflow/execute"
        ),
    )
    async def execute_workflow(ctx: inngest.Context):
        workflow = ctx.event.data["workflow"]
        user_input = ctx.event.data["input"]
        run_id = ctx.event.data["run_id"]

        workflow_runs[run_id] = {
        "status": "running",
        "history": []
        }

        nodes = {
            node["id"]: node
            for node in workflow["nodes"]
        }

        edges = workflow["edges"]
        current_id = workflow["startNodeId"]
        history = []

        while current_id:
            node = nodes[current_id]

            async def ask_ai():
                print((f'Mock AI evaluating: {node['prompt']}'))
                return "YES"

            answer = await ctx.step.run(
                f"decision-{current_id}",
                ask_ai,
            )

            history.append({
                "nodeId": current_id,
                "prompt": node["prompt"],
                "answer": answer,
            })

            workflow_runs[run_id]["history"] = history.copy()

            next_edge = next(
                (
                    edge for edge in edges
                    if edge["source"] == current_id
                    and edge["sourceHandle"] == answer.lower()
                ),
                None,
            )

            current_id = (
                next_edge["target"]
                if next_edge else None
            )
        workflow_runs[run_id]["status"] = "completed"

        return {
            "status": "completed",
            "history": history,
        }

    return execute_workflow
