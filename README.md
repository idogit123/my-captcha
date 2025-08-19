# my-captcha — Voice CAPTCHA

My CAPCHA relies on a model that can tell if a voice recording is deepfake or not.
But then a bot can upload a prerecorded human voice recording. 
To prevent that I'm also prompting the user random prompts, and using
speech recognition to verify that the user said the prompt. 
The client is built with simple JS, HTML and CSS.
The server is built in python using FastAPI
For the deepfake voice detection I'm using a Hugging Face model. When you first run the server it downloads the model and runs it loacaly without downloading on subsequent runs.
For the speech to text I'm using the speech recognition library.
For text similarity check I'm using the fuzzywuzzy library.

## How it works

1. The client requests a short prompt from the server.
2. The user records themselves reading the prompt and the browser sends a WAV file to the server.
3. The server runs two checks:
   - A deepfake detector (Hugging Face `audio-classification` pipeline) to detect synthetic/AI audio.
   - Speech-to-text (Google via `SpeechRecognition`) and a fuzzy-text similarity check to ensure the spoken text matches the prompt.

The server also tracks failed attempts and bans IPs after repeated failures.

## Requirements

Python packages:

- fastapi
- uvicorn[standard]
- python-dotenv
- transformers
- torch
- torchaudio
- scipy
- SpeechRecognition
- fuzzywuzzy
- python-Levenshtein  # optional but speeds up fuzzywuzzy
- cryptography  # required for certificates/generate_ssl.py

Client-side / browser libraries:

- canvas-confetti (loaded from CDN in `client/index.html`)
- No other external JS libraries — the client uses vanilla JS and Web APIs (MediaRecorder, Fetch).

Other requirements / notes:

- A Hugging Face audio classification model (set `MODEL_NAME` in `.env`).
- A working microphone in the browser.
- The server serves HTTPS on port 443 using `certificates/server.key` and `certificates/server.crt` (self-signed certificate included for local testing).
- The repository includes a helper script `certificates/generate_ssl.py` to create `server.key` and `server.crt` using the `cryptography` package.

## Installation

1. Install python 3.12


2. Install Python dependencies:

```powershell
pip install -r requirements.txt
```


4. Generate HTTPS certificates using the included script:

```powershell
# From the repository root (PowerShell)
python certificates\generate_ssl.py
```

This requires the `cryptography` package (already added to `requirements.txt`). The script writes `certificates/server.key` and `certificates/server.crt`.

## Trust the self-signed certificate in Chrome (important)
Before using the app you must make Chrome accept the server certificate used at `https://localhost:443`. There are two common ways to do this:
Method 1 — Install the certificate persistently (recommended):

1. Open `certificates/server.crt` in File Explorer and double-click it.
2. Click `Install Certificate...`.
3. Choose `Local Machine` (you may need admin rights).
4. Select `Place all certificates in the following store` and pick `Trusted Root Certification Authorities`.
5. Finish the wizard and accept any prompts. Restart Chrome.

Method 2 — Temporary bypass in Chrome (quick, not persistent):

1. Open Chrome and navigate to `https://localhost:443`.
2. When you see the "Your connection is not private" page, click `Advanced`.
3. Click `Proceed to localhost (unsafe)` to bypass the warning for this session.

Notes / caveats:

- Method 2 only creates a temporary exception for the browser session and may be cleared when Chrome restarts. It does not permanently trust the certificate system-wide.
- Some errors (HSTS or strict security policies) may not present a "Proceed" option in Chrome — in that case use Method 1.

## Running (server + client)

1. Start the server (PowerShell):

```powershell
python server\main.py
```

The server binds to port 443 and uses the included cert and key.

2. Serve the client folder or open it from a local dev server. The code assumes the client will be served from `http://127.0.0.1:5500` (see CORS in `server/main.py`). Two simple options:

- Use VS Code Live Server (serves on port 5500 by default).
- Use Python's simple HTTP server (run from the repository root):

```powershell
# From repository root - serves the project on port 5500
python -m http.server 5500
```

Then open the client in the browser at:

```
http://127.0.0.1:5500/client/index.html
```

Important: first open `https://localhost:443` in Chrome and accept/trust the certificate (see instructions above). If the certificate is not trusted, browser calls from the client to `https://localhost:443` will fail.

## Configuration

- ENV: `MODEL_NAME` — Hugging Face model id used by the `audio-classification` pipeline.
- ENV: `MAX_AUDIO_FILE_SIZE` — maximum allowed upload size in bytes (the code expects ~1MB by default).

## Troubleshooting

- If the deepfake detector raises errors, ensure `torch`/`torchaudio` are installed and that the `MODEL_NAME` is correct and compatible with your environment.
- If speech-to-text fails often, check your microphone quality and background noise; the project uses Google Web Speech via the `SpeechRecognition` package.
- If CORS fails, confirm the client origin matches `allow_origins` in `server/main.py` or update the server CORS settings.

## Files of interest

- `server/main.py` — FastAPI server and endpoints.
- `server/audio_detector.py` — wraps the Hugging Face audio-classification pipeline.
- `server/text_to_speech.py` — uses `SpeechRecognition` + fuzzy matching.
- `client/index.html` and `client/js/*.js` — front-end behavior and recording logic.

## Thanks

Thanks to my brother Uri who helped test and came up with many cool ideas like the volume meter and the confetti.
I also want to thank Eyal Englender for being the cyber GOAT.