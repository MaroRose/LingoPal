
  let recognition;
  let microphoneStream;
  let audioContext;
  let audioSource;
  let audioProcessor;
  let silentGain;
  let pcmChunks = [];
  let recordingSampleRate = 44100;
  let recordingComplete = Promise.resolve();
  let finishRecording;

  async function startVoiceCapture() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !navigator.mediaDevices?.getUserMedia) {
      document.getElementById('voiceStatus').innerText =
        'Voice capture is not supported in this browser.';
      return;
    }

    if (audioContext?.state === 'running') {
      return;
    }

    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      recordingSampleRate = audioContext.sampleRate;
      audioSource = audioContext.createMediaStreamSource(microphoneStream);
      audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      pcmChunks = [];

      audioProcessor.onaudioprocess = (event) => {
        pcmChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };

      audioSource.connect(audioProcessor);
      audioProcessor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      recordingComplete = new Promise((resolve) => {
        finishRecording = resolve;
      });

      recognition = new SpeechRecognition();
    } catch (error) {
      console.error('Microphone access failed:', error);
      document.getElementById('voiceStatus').innerText =
        'Microphone access was denied or unavailable.';
      return;
    }

    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const latestResult = event.results[event.results.length - 1];
      document.getElementById('voiceText').innerText =
        latestResult[0].transcript;
    };

    recognition.onend = () => {
      document.getElementById('voiceStatus').innerText =
        'Voice capture ended.';
    };

    recognition.onerror = (event) => {
      document.getElementById('voiceStatus').innerText =
        `Voice capture error: ${event.error}`;
    };

    document.getElementById('voiceStatus').innerText =
      'Listening...';
    console.log('Voice capture listening.');

    recognition.start();
  }

  function stopVoiceCapture() {
    recognition?.stop();

    audioProcessor?.disconnect();
    audioSource?.disconnect();
    silentGain?.disconnect();

    microphoneStream?.getTracks().forEach((track) => track.stop());
    audioContext?.close().then(() => finishRecording?.());
    document.getElementById('voiceStatus').innerText = 'Voice capture stopped.';
    console.log('Voice capture stopped.');
  }

  async function saveAudioRecording() {
    try {
      if (audioContext?.state === 'running') {
        document.getElementById('voiceStatus').innerText = 'Stopping recording...';
        stopVoiceCapture();
      }

      await recordingComplete;

      if (!pcmChunks.length) {
        document.getElementById('voiceStatus').innerText =
          'Record audio before saving.';
        return;
      }

      const sampleCount = pcmChunks.reduce(
        (total, chunk) => total + chunk.length,
        0
      );
      const samples = new Int16Array(sampleCount);
      let sampleOffset = 0;

      for (const chunk of pcmChunks) {
        for (const value of chunk) {
          const sample = Math.max(-1, Math.min(1, value));
          samples[sampleOffset] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          sampleOffset += 1;
        }
      }

      const encoder = new lamejs.Mp3Encoder(1, recordingSampleRate, 128);
      const mp3Chunks = [];
      const sampleBlockSize = 1152;

      for (let offset = 0; offset < samples.length; offset += sampleBlockSize) {
        const mp3Buffer = encoder.encodeBuffer(
          samples.subarray(offset, offset + sampleBlockSize)
        );
        if (mp3Buffer.length > 0) {
          mp3Chunks.push(new Int8Array(mp3Buffer));
        }
      }

      const finalBuffer = encoder.flush();
      if (finalBuffer.length > 0) {
        mp3Chunks.push(new Int8Array(finalBuffer));
      }

      const audioUrl = URL.createObjectURL(new Blob(mp3Chunks, { type: 'audio/mpeg' }));
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = 'audio_recording.mp3';
      link.click();
      URL.revokeObjectURL(audioUrl);
      document.getElementById('voiceStatus').innerText = 'MP3 recording saved.';
    } catch (error) {
      console.error('Unable to convert recording to MP3:', error);
      document.getElementById('voiceStatus').innerText =
        'The recording could not be decoded. Try recording again.';
    }
  }
