from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import requests
import os
from dotenv import load_dotenv
import uvicorn

app = FastAPI()

HUGGING_FACE_API_URL = os.getenv("HUGGING_FACE_API_URL")
HUGGING_FACE_API_TOKEN = os.getenv("HF_API_TOKEN")


@app.post("/detect")
async def detect_deepfake(file: UploadFile = File(...)):
    # Read file
    audio_bytes = await file.read()
    headers = {
        "Authorization": f"Bearer {HUGGING_FACE_API_TOKEN}",
        "Content-Type": "application/octet-stream"
    }

    response = requests.post(HUGGING_FACE_API_URL, headers=headers, data=audio_bytes)
    
    if response.status_code != 200:
        return JSONResponse(status_code=500, content={"error": "Model API error"})
    result = response.json()

    # Interpret result (customize based on model output)
    approved = result.get("label", "real") == "real"
    return {"approved": approved, "details": result}

@app.get("/")
async def root():
    # Base page for my app
    return {"message": "Welcome to Ido's CAPTCHA"}

if __name__ == "__main__":
    load_dotenv()
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=443,
        ssl_keyfile="certificates/server.key",
        ssl_certfile="certificates/server.crt"
    )
