export class VoiceHandler {
  constructor({ onText } = {}) {
    this.onText = onText;
    this.recognition = null;
    this.active = false;
    this.permissionHint = null;
    this.lastTranscript = '';
  }

  createPermissionHint() {
    const el = document.createElement('div');
    el.className = 'permission-hint';
    el.textContent = 'マイク/音声認識の権限が必要です。クリックで開始。';
    document.body.appendChild(el);
    return el;
  }

  hidePermissionHint() {
    if (this.permissionHint) {
      this.permissionHint.remove();
      this.permissionHint = null;
    }
  }

  start() {
    if (this.active) return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported');
      this.hidePermissionHint();
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ja-JP';
    this.recognition.interimResults = true;
    this.recognition.continuous = true;

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (transcript && transcript !== this.lastTranscript) {
          this.lastTranscript = transcript;
          this.onText?.({ text: transcript });
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error', event.error);
    };

    this.recognition.onstart = () => {
      this.hidePermissionHint();
    };

    this.recognition.start();
    this.active = true;
  }
}
