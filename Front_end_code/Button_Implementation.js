const recordButton = document.getElementById("record-button");
const stopButton = document.getElementById("stop-button");
const uploadButton = document.getElementById("upload-button");
const audioFileInput = document.getElementById("audio-file");
const playButton = document.getElementById("play-button");
const statusMessage = document.getElementById("status");
const playback = document.getElementById("playback");
const transcript = document.getElementById("transcript");

let mediaRecorder;
let audioStream;
let audioChunks = [];
let playbackUrl;

function getRecordingExtension(mimeType) {
  if (mimeType.includes("ogg")) {
    return "ogg";
  }
  if (mimeType.includes("mp4")) {
    return "m4a";
  }
  return "webm";
}

function setPlaybackSource(audioBlob) {
  if (playbackUrl) {
    URL.revokeObjectURL(playbackUrl);
  }

  playbackUrl = URL.createObjectURL(audioBlob);
  playback.src = playbackUrl;
  playback.hidden = false;
  playButton.disabled = false;
}

function downloadRecording(audioBlob) {
  const extension = getRecordingExtension(audioBlob.type);
  const filename = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
  const downloadUrl = URL.createObjectURL(audioBlob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = filename;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

recordButton.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    statusMessage.textContent = "Audio recording is not supported in this browser.";
    return;
  }

  recordButton.disabled = true;
  statusMessage.textContent = "Waiting for microphone permission...";

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    mediaRecorder = new MediaRecorder(
      audioStream,
      mimeType ? { mimeType } : undefined
    );
    audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", () => {
      const audioBlob = new Blob(audioChunks, {
        type: mediaRecorder.mimeType || "audio/webm",
      });

      audioStream?.getTracks().forEach((track) => track.stop());
      audioStream = undefined;
      stopButton.disabled = true;
      uploadButton.disabled = false;
      recordButton.disabled = false;

      if (!audioBlob.size) {
        statusMessage.textContent = "No audio was captured. Try recording again.";
        return;
      }

      setPlaybackSource(audioBlob);
      downloadRecording(audioBlob);
      statusMessage.textContent = "Recording finished. Your audio was downloaded and is ready to play.";
      transcript.textContent = "Transcription is not configured for this recording.";
    }, { once: true });

    mediaRecorder.addEventListener("error", (event) => {
      audioStream?.getTracks().forEach((track) => track.stop());
      audioStream = undefined;
      recordButton.disabled = false;
      stopButton.disabled = true;
      uploadButton.disabled = false;
      statusMessage.textContent =
        `Recording failed: ${event.error?.message || "The browser could not record audio."}`;
    }, { once: true });

    mediaRecorder.start();
    stopButton.disabled = false;
    uploadButton.disabled = true;
    statusMessage.textContent = "Recording...";
  } catch (error) {
    audioStream?.getTracks().forEach((track) => track.stop());
    audioStream = undefined;
    recordButton.disabled = false;
    stopButton.disabled = true;
    uploadButton.disabled = false;
    statusMessage.textContent = error.name === "NotAllowedError"
      ? "Microphone access was denied. Allow microphone access and try again."
      : `Could not start recording: ${error.message}`;
  }
});

stopButton.addEventListener("click", () => {
  if (mediaRecorder?.state === "recording") {
    stopButton.disabled = true;
    statusMessage.textContent = "Finishing recording...";
    mediaRecorder.stop();
  }
});

uploadButton.addEventListener("click", () => {
  audioFileInput.click();
});

audioFileInput.addEventListener("change", () => {
  const file = audioFileInput.files?.[0];
  audioFileInput.value = "";

  if (!file) {
    return;
  }
  if (file.type && !file.type.startsWith("audio/")) {
    statusMessage.textContent = "Please choose an audio file.";
    return;
  }

  setPlaybackSource(file);
  statusMessage.textContent = `Loaded "${file.name}". Press Play audio to listen.`;
  transcript.textContent = "Transcription is not configured for uploaded audio.";
});

playButton.addEventListener("click", () => {
  playback.play().catch((error) => {
    statusMessage.textContent = `Could not play this audio file: ${error.message}`;
  });
});

playback.addEventListener("ended", () => {
  statusMessage.textContent = "Playback finished.";
});

window.addEventListener("beforeunload", () => {
  audioStream?.getTracks().forEach((track) => track.stop());
  if (playbackUrl) {
    URL.revokeObjectURL(playbackUrl);
  }
});
