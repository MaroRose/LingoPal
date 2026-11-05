const { v2 } = require("@google-cloud/speech");

let speechClient;

async function transcribeAudio(audioContent) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error("Set GOOGLE_CLOUD_PROJECT to your Google Cloud project ID.");
  }

  speechClient ??= new v2.SpeechClient();
  const [response] = await speechClient.recognize({
    recognizer: `projects/${projectId}/locations/global/recognizers/_`,
    config: {
      autoDecodingConfig: {},
      languageCodes: ["en-US"],
      model: "chirp_3",
    },
    content: audioContent,
  });

  return (response.results || [])
    .map((result) => result.alternatives?.[0]?.transcript)
    .filter(Boolean)
    .join(" ")
    .trim();
}

module.exports = { transcribeAudio };
