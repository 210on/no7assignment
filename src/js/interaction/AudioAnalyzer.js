export class AudioAnalyzer {
  constructor({ onEnergy } = {}) {
    this.onEnergy = onEnergy;
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.dataArray = null;
    this.running = false;
  }

  async init() {
    if (this.running) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);
      this.dataArray = new Float32Array(this.analyser.fftSize);
      this.running = true;
      this.tick();
    } catch (error) {
      console.warn('Microphone not available', error);
    }
  }

  tick() {
    if (!this.running) return;

    this.analyser.getFloatTimeDomainData(this.dataArray);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i += 1) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);

    // Compute simple spectral centroid proxy
    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(frequencyData);
    let weightedSum = 0;
    let total = 0;
    for (let i = 0; i < frequencyData.length; i += 1) {
      weightedSum += frequencyData[i] * i;
      total += frequencyData[i];
    }
    const centroid = total > 0 ? weightedSum / total / frequencyData.length : 0;

    this.onEnergy?.({ amplitude: Math.min(rms * 10, 1), frequency: centroid });

    requestAnimationFrame(() => this.tick());
  }
}
