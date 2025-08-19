import * as ui from "./ui.js";
import * as audio from "./audio.js";
import { fetchPrompt } from "./prompt.js";
import { API_BASE } from "./config.js";

let readyToRecord = false;
let stopTimer = null;

ui.hideResults();

ui.elements.startBtn.onclick = async () => {
  if (!readyToRecord) {
    await fetchPrompt();
    readyToRecord = true;
    return;
  }

  try {
    await audio.startRecording();
    ui.setStatus("Recording...");
    ui.setStartButton("", true);
    ui.setStopButtonDisabled(false);

    // Automatically stop after 5 seconds
    stopTimer = setTimeout(() => ui.elements.stopBtn.click(), 5000);
  } catch (err) {
    ui.setStatus("Error accessing microphone.");
    console.log(err);
  }
};

ui.elements.stopBtn.onclick = async () => {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  const { wavBlob, stream } = await audio.stopRecording();
  ui.setStatus("Stopping...");
  ui.setStartButton("", false);
  ui.setStopButtonDisabled(true);

  if (!wavBlob) {
    // nothing to send
    audio.forceStopAndCleanup();
    return;
  }

  // send to server
  const formData = new FormData();
  formData.append("file", wavBlob, "recording.wav");
  ui.setStatus("Sending to server...");

  try {
  const response = await fetch(API_BASE + "/detect", {
      method: "POST",
      body: formData
    });

    if (response.status === 403) {
      const result = await response.json();
      ui.setStatus(result.error || "You are banned due to repeated failed attempts.");
      ui.setStartButton("Get Prompt", true);
      ui.setStopButtonDisabled(true);
      ui.hideResults();
      audio.forceStopAndCleanup();
      return;
    }

    if (response.status === 400) {
      const result = await response.json();
      ui.setStatus(result.error || "Bad request.");
      ui.hideResults();
      audio.forceStopAndCleanup();
      return;
    }

    const result = await response.json();
    ui.updateResultsFromResponse(result);
    readyToRecord = false;
    ui.setStartButton("Get Prompt", false);
    ui.setPromptText("");
  } catch (err) {
    ui.setStatus("Error sending audio.");
    console.log(err);
  }

  // cleanup audio
  audio.forceStopAndCleanup();
};
