let mediaRecorder;
let audioChunks = [];
let readyToRecord = false;
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDisplay = document.getElementById("status");
const promptElem = document.getElementById("prompt");
const volumeBar = document.getElementById("volume-bar");
const volumeContainer = document.getElementById("volume-container");
const resultsBox = document.getElementById("results-box");
let volumeAnimationId = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let streamRef = null;

const deepfakeResults = document.getElementById("deepfake-results");
const sttResults = document.getElementById("stt-results");
const finalResults = document.getElementById("final-results");
const deepfakeLabel = document.getElementById("deepfake-label");
const deepfakeConfidence = document.getElementById("deepfake-confidence");
const sttTranscription = document.getElementById("stt-transcription");
const sttPrompt = document.getElementById("stt-prompt");
const sttSimilarity = document.getElementById("stt-similarity");
const finalResultP = document.querySelector("#final-results p");

hideResults();

function hideResults() {
    // Hide all result sections except the Results title
    deepfakeResults.style.display = "none";
    sttResults.style.display = "none";
    finalResults.style.display = "none";

    // Also clear their contents
    deepfakeLabel.textContent = "";
    deepfakeConfidence.textContent = "";
    sttTranscription.textContent = "";
    sttPrompt.textContent = "";
    sttSimilarity.textContent = "";
    finalResultP.textContent = "";

    [deepfakeLabel, deepfakeConfidence, sttSimilarity, finalResultP].forEach(el => el.classList.remove("flashy"));
}

// When you want to show results again (after filling them), add:
function showResults(result) {
    // Helper to show with slide animation
    function slideIn(element) {
        element.style.display = "";
        element.classList.add("slide-in");
        setTimeout(() => {
            element.classList.remove("slide-in");
        }, 600);
    }

    // Show results one by one with delays
    slideIn(deepfakeResults);
    if (result.approved && !result.details.deepfake.is_deepfake) {
        showConfetti();
    }
    setTimeout(() => {
        slideIn(sttResults);
        if (result.approved && result.details.stt.similarity > 85) {
            showConfetti();
        }
    }, 650);
    setTimeout(() => {
        slideIn(finalResults);
        if (result.approved) {
            showConfetti();
        }
    }, 1300);
}

function showConfetti() {
    if (window.confetti) {
        window.confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

async function fetchPrompt() {
    statusDisplay.textContent = "Getting prompt...";
    startBtn.disabled = true;
    promptElem.textContent = "Loading prompt...";
    promptElem.classList.add("placeholder");
    hideResults();
    try {
        const response = await fetch("https://localhost:443/prompt");

        if (response.status === 403) {
            const result = await response.json();
            statusDisplay.textContent = result.error || "You are banned due to repeated failed attempts.";
            startBtn.disabled = true;
            stopBtn.disabled = true;
            promptElem.textContent = "";
            promptElem.classList.remove("placeholder");
            return;
        }

        const data = await response.json();
        promptElem.textContent = data.prompt;
        promptElem.classList.remove("placeholder");
        startBtn.textContent = "Start Recording";
        startBtn.disabled = false;
        statusDisplay.textContent = "Say the prompt above and record your voice.";
    } catch (err) {
        statusDisplay.textContent = "Error getting prompt.";
        startBtn.disabled = false;
        promptElem.textContent = "Prompt unavailable.";
        promptElem.classList.add("placeholder");
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
    streamRef = stream;
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
        stopVolumeMeter();
        sendAudio();
    };

    mediaRecorder.start();
    statusDisplay.textContent = "Recording...";
    startBtn.disabled = true;
    stopBtn.disabled = false;

    startVolumeMeter(stream);

    // Automatically stop after 5 seconds
    setTimeout(() => stopBtn.click(), 5000);
};

stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        statusDisplay.textContent = "Stopping...";
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
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
            hideResults();
            return;
        }

        if (response.status === 400) {
            const result = await response.json();
            statusDisplay.textContent = result.error || "Bad request.";
            hideResults();
            return;
        }

        const result = await response.json();

        // Fill Deepfake Results
        const deepfake = result.details.deepfake;
        deepfakeConfidence.textContent = `${deepfake.confidence}%`;
        if (deepfake.is_deepfake) {
            deepfakeLabel.textContent = "AI";
            deepfakeLabel.style.color = "#ff5555";
            deepfakeConfidence.style.color = "#ff5555";
        } else {
            deepfakeLabel.textContent = "Human";
            deepfakeLabel.style.color = "#50fa7b";
            deepfakeConfidence.style.color = "#50fa7b";
        }

        // Fill Speech-to-Text Results
        const stt = result.details.stt;
        sttTranscription.textContent = stt.text;
        sttPrompt.textContent = stt.prompt;
        sttSimilarity.textContent = `${stt.similarity}%`;
        if (stt.similarity > 85) {
            sttSimilarity.style.color = "#50fa7b";
        } else {
            sttSimilarity.style.color = "#ff5555";
        }

        // Fill Final Results
        finalResultP.textContent = result.approved ? "You are approved" : "You are rejected";

        // Flashy effect only if approved
        [deepfakeLabel, deepfakeConfidence, sttSimilarity, finalResultP].forEach(el => {
            if (result.approved) {
                el.classList.add("flashy");
            } else {
                el.classList.remove("flashy");
            }
        });

        showResults(result);

        // Reset for next attempt
        statusDisplay.textContent = "";
        startBtn.textContent = "Get Prompt";
        promptElem.textContent = "";
        readyToRecord = false;
        startBtn.disabled = false;
    } catch (err) {
        statusDisplay.textContent = "Error sending audio.";
        console.log(err)
    }
    stopVolumeMeter();
    if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
        streamRef = null;
    }
}

function startVolumeMeter(stream) {
    if (!volumeBar) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    volumeContainer.style.display = "flex";
    function animate() {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);
        // Calculate RMS (root mean square) for volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            let val = (dataArray[i] - 128) / 128;
            sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const percent = Math.min(1, rms * 2); // scale for UI
        volumeBar.style.width = (percent * 100) + "%";
        volumeBar.style.background = percent > 0.6 ? "#ff5555" : percent > 0.3 ? "#ffb86c" : "#50fa7b";
        volumeAnimationId = requestAnimationFrame(animate);
    }
    animate();
}

function stopVolumeMeter() {
    if (volumeAnimationId) {
        cancelAnimationFrame(volumeAnimationId);
        volumeAnimationId = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (volumeBar) {
        volumeBar.style.width = "0%";
        volumeBar.style.background = "#44475a";
    }
}