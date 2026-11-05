# LingoPal audio transcription

The app records audio in the browser or accepts an audio file, then sends it to
Google Cloud Speech-to-Text V2 for transcription. The server uses Application
Default Credentials; never put Google Cloud credentials in browser code.

## To Do

1. Get the upload button working
      a. Use Google text to speech API to transcribe the user's spoken words
      b. Allow user to upload both audio and text file

2. Analyze user data so to find the most common words and phrases that the user needs to know
      a. Identify Language specific grammatical features that are need to construct phrases
      b. Use IPA to demonstrate how to pronounce words in the target language

3. Add login feature with backend server to store account data
