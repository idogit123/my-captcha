import { setStatus, setPromptText, setStartButton, setStopButtonDisabled, hideResults } from "./ui.js";
import { API_BASE } from "./config.js";

export async function fetchPrompt() {
  setStatus("Getting prompt...");
  setStartButton("", true);
  setPromptText("Loading prompt...", true);
  hideResults();
  try {
  const response = await fetch(API_BASE + "/prompt");

    if (response.status === 403) {
      const result = await response.json();
      setStatus(result.error || "You are banned due to repeated failed attempts.");
      setStartButton("Get Prompt", true);
      setStopButtonDisabled(true);
      setPromptText("", false);
      return { error: true, banned: true };
    }

    const data = await response.json();
    setPromptText(data.prompt, false);
    setStartButton("Start Recording", false);
    setStatus("Say the prompt above and record your voice.");
    return { prompt: data.prompt };
  } catch (err) {
    setStatus("Error getting prompt.");
    setStartButton("Get Prompt", false);
    setPromptText("Prompt unavailable.", true);
    console.log(err);
    return { error: true };
  }
}
