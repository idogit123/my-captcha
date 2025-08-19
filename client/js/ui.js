// UI helper module: DOM references and UI update functions
export const elements = {
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  statusDisplay: document.getElementById("status"),
  promptElem: document.getElementById("prompt"),
  volumeBar: document.getElementById("volume-bar"),
  volumeContainer: document.getElementById("volume-container"),
  resultsBox: document.getElementById("results-box"),
  deepfakeResults: document.getElementById("deepfake-results"),
  sttResults: document.getElementById("stt-results"),
  finalResults: document.getElementById("final-results"),
  deepfakeLabel: document.getElementById("deepfake-label"),
  deepfakeConfidence: document.getElementById("deepfake-confidence"),
  sttTranscription: document.getElementById("stt-transcription"),
  sttPrompt: document.getElementById("stt-prompt"),
  sttSimilarity: document.getElementById("stt-similarity"),
  finalResultP: document.querySelector("#final-results p")
};

export function hideResults() {
  const el = elements;
  // Hide all result sections except the Results title
  el.deepfakeResults.style.display = "none";
  el.sttResults.style.display = "none";
  el.finalResults.style.display = "none";

  // Also clear their contents
  el.deepfakeLabel.textContent = "";
  el.deepfakeConfidence.textContent = "";
  el.sttTranscription.textContent = "";
  el.sttPrompt.textContent = "";
  el.sttSimilarity.textContent = "";
  el.finalResultP.textContent = "";

  [el.deepfakeLabel, el.deepfakeConfidence, el.sttSimilarity, el.finalResultP].forEach(
    (e) => e.classList.remove("flashy")
  );
}

export function showConfetti() {
  if (window.confetti) {
    window.confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

export function showResults(result) {
  // Helper to show with slide animation
  function slideIn(element) {
    element.style.display = "";
    element.classList.add("slide-in");
    setTimeout(() => element.classList.remove("slide-in"), 600);
  }

  slideIn(elements.deepfakeResults);
  if (result.approved && !result.details.deepfake.is_deepfake) {
    showConfetti();
  }

  setTimeout(() => {
    slideIn(elements.sttResults);
    if (result.approved && result.details.stt.similarity > 85) {
      showConfetti();
    }
  }, 650);

  setTimeout(() => {
    slideIn(elements.finalResults);
    if (result.approved) showConfetti();
  }, 1300);
}

export function setStatus(text) {
  elements.statusDisplay.textContent = text;
}

export function setPromptText(text, isPlaceholder = false) {
  elements.promptElem.textContent = text;
  if (isPlaceholder) elements.promptElem.classList.add("placeholder");
  else elements.promptElem.classList.remove("placeholder");
}

export function setStartButton(text, disabled) {
  elements.startBtn.textContent = text;
  elements.startBtn.disabled = !!disabled;
}

export function setStopButtonDisabled(disabled) {
  elements.stopBtn.disabled = !!disabled;
}

export function updateResultsFromResponse(result) {
  const deepfake = result.details.deepfake;
  elements.deepfakeConfidence.textContent = `${deepfake.confidence}%`;
  if (deepfake.is_deepfake) {
    elements.deepfakeLabel.textContent = "AI";
    elements.deepfakeLabel.style.color = "#ff5555";
    elements.deepfakeConfidence.style.color = "#ff5555";
  } else {
    elements.deepfakeLabel.textContent = "Human";
    elements.deepfakeLabel.style.color = "#50fa7b";
    elements.deepfakeConfidence.style.color = "#50fa7b";
  }

  const stt = result.details.stt;
  elements.sttTranscription.textContent = stt.text;
  elements.sttPrompt.textContent = stt.prompt;
  elements.sttSimilarity.textContent = `${stt.similarity}%`;
  if (stt.similarity > 85) elements.sttSimilarity.style.color = "#50fa7b";
  else elements.sttSimilarity.style.color = "#ff5555";

  elements.finalResultP.textContent = result.approved ? "You are approved" : "You are rejected";

  [elements.deepfakeLabel, elements.deepfakeConfidence, elements.sttSimilarity, elements.finalResultP].forEach(
    (el) => {
      if (result.approved) el.classList.add("flashy");
      else el.classList.remove("flashy");
    }
  );

  showResults(result);

  // reset small bits of UI handled here
  setStatus("");
  setStartButton("Get Prompt", false);
  setPromptText("");
}
