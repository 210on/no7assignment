import './scss/main.scss';

import { WaterRenderer } from './js/core/WaterRenderer.js';
import { FluidSimulator } from './js/core/FluidSimulator.js';
import { MouseHandler } from './js/interaction/MouseHandler.js';
import { KeyboardHandler } from './js/interaction/KeyboardHandler.js';
import { VoiceHandler } from './js/interaction/VoiceHandler.js';
import { AudioAnalyzer } from './js/interaction/AudioAnalyzer.js';
import { DebugPanel } from './js/ui/DebugPanel.js';
import { IntroOverlay } from './js/ui/IntroOverlay.js';
import { TextOverlay } from './js/ui/TextOverlay.js';
import { ColorPalette } from './js/ui/ColorPalette.js';

const root = document.getElementById('app');
const waterRenderer = new WaterRenderer(root);
const fluidSimulator = new FluidSimulator();

const textOverlay = new TextOverlay(root, {
  getAudioLevel: () => fluidSimulator.getRenderState().audioAmplitude ?? 0,
  getWaterEnergy: () => fluidSimulator.getRenderState().energy ?? 0,
});

const mouseHandler = new MouseHandler(waterRenderer.canvas, (payload) => {
  fluidSimulator.injectPointerForce(payload);
});

// クリックで滴下する色をユーザーが選べるようにするパレット
// （MouseHandler の COLOR_POOL と連動）
// eslint-disable-next-line no-unused-vars
const colorPalette = new ColorPalette(root, mouseHandler);

const keyboardHandler = new KeyboardHandler({
  onRipple: (payload) => fluidSimulator.injectKeyRipple(payload),
  onDeleteToggle: (active) => fluidSimulator.setDeleteMode(active),
});

const voiceHandler = new VoiceHandler({
  onText: (textPayload) => {
    fluidSimulator.handleRecognizedText(textPayload);
    const stateForText = fluidSimulator.getRenderState();
    const intensity = stateForText.audioPeak ?? stateForText.audioAmplitude ?? 0;
    textOverlay.addText(textPayload.text, { intensity });
  },
});

const audioAnalyzer = new AudioAnalyzer({
  onEnergy: (energyPayload) => fluidSimulator.applyAudioEnergy(energyPayload),
});

const debugPanel = new DebugPanel({
  fluidSimulator,
  waterRenderer,
});

const bootAudio = () => {
  audioAnalyzer.init();
  voiceHandler.start();
};

// 初期タイトルと操作説明を表示し、クリックでマイク/音声認識の許可を取って作品を開始する。
const introOverlay = new IntroOverlay(root, () => {
  bootAudio();
});

const resize = () => {
  waterRenderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener('resize', resize);
resize();

let lastTime = performance.now();
const loop = (time) => {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  fluidSimulator.update(delta, time);
  const state = fluidSimulator.getRenderState();
  waterRenderer.render(time / 1000, state);
  textOverlay.update(time / 1000, state);

  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// Expose for debugging in devtools.
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('Water renderer + fluid simulator ready');
  window.__WATER_DEBUG__ = {
    fluidSimulator,
    waterRenderer,
    mouseHandler,
    keyboardHandler,
  };
}
