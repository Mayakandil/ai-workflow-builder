import inngest 
import inngest.fast_api
from fastapi import FastAPI

app = FastAPI()

inngest_client = inngest.Inngest(app_id="ai_workflow_builder",is_production=False)
#tells the SDK we're using a development environment.

@app.get("/")
def home():
    return {"message": "AI Workflow Backend is running!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@inngest_client.create_function(
    fn_id="hello-workflow",
    trigger=inngest.TriggerEvent(event="workflow/hello"),
)
async def hello_workflow(ctx: inngest.Context):
    return {"message": "Hello from Inngest!"}

@app.post("/trigger")
async def trigger_workflow():

    await inngest_client.send(
        inngest.Event(
            name="workflow/hello",
            data={"message": "My first Inngest event"}
        )
    )

    return {"status": "Event sent successfully"}

inngest.fast_api.serve(
    app,
    inngest_client,
    [hello_workflow],
)