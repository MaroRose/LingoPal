
const translateButton = document.getElementById("translateButton");
const inputText = document.getElementById("inputText");
const targetLanguage = document.getElementById("targetLanguage");
const translatedText = document.getElementById("translatedText");

translateButton.addEventListener("click", translateText);

async function translateText() {
  const text = inputText.value.trim();
  if (!text) {
    translatedText.textContent = "Enter text to translate.";
    inputText.focus();
    return;
  }

  translateButton.disabled = true;
  translatedText.textContent = "Translating...";

  try {
    const query = new URLSearchParams({
      q: text,
      langpair: `en|${targetLanguage.value}`,
    });
    const response = await fetch(`https://api.mymemory.translated.net/get?${query}`);
    if (!response.ok) {
      throw new Error(`Translation request failed (${response.status}).`);
    }

    const data = await response.json();
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
      throw new Error(data.responseDetails || "No translation was returned.");
    }

    translatedText.textContent = data.responseData.translatedText;
  } catch (error) {
    console.error("Error translating text:", error);
    translatedText.textContent = `Translation failed: ${error.message}`;
  } finally {
    translateButton.disabled = false;
  }
}
