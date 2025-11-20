from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import control, implementation, assistant

app = FastAPI(
    title="NIST Compliance API",
    description="API for NIST 800-53 Control implementation and compliance",
    version="2.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(control.router)
app.include_router(implementation.router)
app.include_router(assistant.router)

@app.get("/")
async def root():
    return {"message": "NIST Compliance API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
