let mediaRecorder;
let audioChunks = [];
let readyToRecord = false;
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDisplay = document.getElementById("status");
const promptElem = document.getElementById("prompt");

async function fetchPrompt() {
    statusDisplay.textContent = "Getting prompt...";
    startBtn.disabled = true;
    promptElem.textContent = "";
    try {
    const response = await fetch("https://localhost:443/prompt");
    const data = await response.json();
    promptElem.textContent = data.prompt;
    startBtn.textContent = "Start Recording";
    startBtn.disabled = false;
    statusDisplay.textContent = "Say the prompt above and record your voice.";
    } catch (err) {
    statusDisplay.textContent = "Error getting prompt.";
    startBtn.disabled = true;
    console.log(err);
    }
}

startBtn.onclick = async () => {
    if (!readyToRecord) {
    await fetchPrompt();
    readyToRecord = true;
    return;
    }
    audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = sendAudio;

    mediaRecorder.start();
    statusDisplay.textContent = "Recording...";
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // Automatically stop after 5 seconds
    setTimeout(() => stopBtn.click(), 5000);
};

stopBtn.onclick = () => {
    mediaRecorder.stop();
    statusDisplay.textContent = "Stopping...";
    startBtn.disabled = false;
    stopBtn.disabled = true;
};

async function sendAudio() {
    // Convert recorded chunks (WebM/Opus) to WAV using wavEncoder.js
    const wavBlob = await window.chunksToWavBlob(audioChunks);

    const formData = new FormData();
    formData.append("file", wavBlob, "recording.wav");

    statusDisplay.textContent = "Sending to server...";

    try {
    const response = await fetch("https://localhost:443/detect", {
        method: "POST",
        body: formData
    });

    if (response.status === 403) {
        const result = await response.json();
        statusDisplay.textContent = result.error || "You are banned due to repeated failed attempts.";
        startBtn.disabled = true;
        stopBtn.disabled = true;
        return;
    }

    const result = await response.json();
    statusDisplay.textContent = `Result: ${result.approved ? "Human ✅" : "AI ❌"} (Confidence: ${result.confidence}%)`;
    
    // Reset for next attempt
    startBtn.textContent = "Get Prompt";
    readyToRecord = false;
    startBtn.disabled = false;
    } catch (err) {
    statusDisplay.textContent = "Error sending audio.";
    console.error(err);
    }
}