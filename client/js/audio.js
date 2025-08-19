import { elements } from "./ui.js";
import { chunksToWavBlob } from "./wavEncoder.js";

let mediaRecorder = null;
let audioChunks = [];
let streamRef = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let volumeAnimationId = null;

export async function startRecording() {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  streamRef = stream;
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.start();
  startVolumeMeter(stream);
}

export function stopRecording() {
  return new Promise((resolve) => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.onstop = async () => {
        stopVolumeMeter();
    // Convert to WAV using module helper
    const wavBlob = await chunksToWavBlob(audioChunks);
        resolve({ wavBlob, stream: streamRef });
      };
      mediaRecorder.stop();
    } else {
      // not recording
      resolve({ wavBlob: null, stream: streamRef });
    }
  });
}

export function forceStopAndCleanup() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  stopVolumeMeter();
  if (streamRef) {
    streamRef.getTracks().forEach((t) => t.stop());
    streamRef = null;
  }
}

export function startVolumeMeter(stream) {
  if (!elements.volumeBar) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyser);
  elements.volumeContainer.style.display = "flex";

  function animate() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      let val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const percent = Math.min(1, rms * 2);
    elements.volumeBar.style.width = percent * 100 + "%";
    elements.volumeBar.style.background = percent > 0.6 ? "#ff5555" : percent > 0.3 ? "#ffb86c" : "#50fa7b";
    volumeAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

export function stopVolumeMeter() {
  if (volumeAnimationId) {
    cancelAnimationFrame(volumeAnimationId);
    volumeAnimationId = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (elements.volumeBar) {
    elements.volumeBar.style.width = "0%";
    elements.volumeBar.style.background = "#44475a";
  }
}
