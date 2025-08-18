let mediaRecorder;
let audioChunks = [];
let readyToRecord = false;
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDisplay = document.getElementById("status");
const promptElem = document.getElementById("prompt");
const volumeBar = document.getElementById("volume-bar");
const volumeContainer = document.getElementById("volume-container");
let volumeAnimationId = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let streamRef = null;

async function fetchPrompt() {
    statusDisplay.textContent = "Getting prompt...";
    startBtn.disabled = true;
    promptElem.textContent = "Loading prompt...";
    promptElem.classList.add("placeholder");
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
            return;
        }

        const result = await response.json();
        // Build a nice result box
        let resultHtml = "";
        if (result.approved) {
            resultHtml = `<span class='result-box approved'>✅ Human<br><span style='font-size:0.9em;color:#8be9fd;'>Confidence: ${result.confidence}%</span></span>`;
        } else {
            resultHtml = `<span class='result-box rejected'>❌ AI<br><span style='font-size:0.9em;color:#8be9fd;'>Confidence: ${result.confidence}%</span></span>`;
        }
        statusDisplay.innerHTML = resultHtml;
        // Reset for next attempt
        startBtn.textContent = "Get Prompt";
        promptElem.textContent = "";
        readyToRecord = false;
        startBtn.disabled = false;
    } catch (err) {
        statusDisplay.textContent = "Error sending audio.";
        console.error(err);
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
    volumeContainer.style.display = "none";
}