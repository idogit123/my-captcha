from fastapi import FastAPI, File, UploadFile, Request
from ban_manager import is_banned, failed_attempt
from audio_detector import is_audio_deepfake
from prompt_manager.main import get_random_prompt, get_current_prompt
from text_to_speach import transcribe_audio, get_similarity_score
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from utils import is_file_size_valid
from dotenv import load_dotenv
from os import getenv
from io import BytesIO
import uvicorn


# FastAPI app initialization
app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/prompt")
async def get_prompt(request: Request):
    client_ip = request.client.host
    if is_banned(client_ip):
        return JSONResponse(status_code=403, content={"error": "You are banned due to repeated failed attempts."})
    prompt = get_random_prompt(client_ip)
    return {"prompt": prompt}

@app.post("/detect")
async def detect_deepfake(request: Request, file: UploadFile = File(...)):
    client_ip = request.client.host
    if is_banned(client_ip):
        return JSONResponse(status_code=403, content={"error": "You are banned due to repeated failed attempts."})

    if not file.filename.lower().endswith(".wav"):
        return JSONResponse(status_code=400, content={"error": "Only WAV files are accepted."})

    if not is_file_size_valid(file.file, int(getenv("MAX_AUDIO_FILE_SIZE"))):
        return JSONResponse(status_code=400, content={"error": "Audio file is too large. Maximum allowed is 1MB (about 30 seconds)."})

    audio_buffer = BytesIO(file.file.read())

    deepfake_result = is_audio_deepfake(audio_buffer)
    if not deepfake_result or not isinstance(deepfake_result, list):
        return JSONResponse(status_code=500, content={"error": "Model did not return a valid result."})
    
    current_prompt = get_current_prompt(client_ip)
    if current_prompt is None:
        return JSONResponse(status_code=400, content={"error": "You must request a prompt before sending audio."})

    stt_response = transcribe_audio(audio_buffer)
    if stt_response.get("success") is False:
        return JSONResponse(status_code=400, content={"error": stt_response.get("error")})

    similarity_score = get_similarity_score(
        stt_response.get("text"),
        current_prompt
    )

    top = max(deepfake_result, key=lambda x: x['score'])
    confidence = round(top['score'] * 100)
    is_deepfake = top['label'].lower() == 'humanvoice' and top['score'] >= 0.9
    approved = not is_deepfake and similarity_score > 85

    # If not approved, count failed attempt, if banned return error
    if not approved and failed_attempt(client_ip):
        return JSONResponse(status_code=403, content={"error": "You are banned due to repeated failed attempts."})

    deepfake_details = {
        "is_deepfake": is_deepfake,
        "confidence": confidence,
        "result": deepfake_result
    }
    stt_details = {
        "text": stt_response.get("text"),
        "prompt": current_prompt,
        "similarity": similarity_score
    }
    details = {
        "deepfake": deepfake_details,
        "stt": stt_details
    }
    return {"approved": approved, "details": details}

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
