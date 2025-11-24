const DEFAULT_BASE_COLOR = '#6fdcff';
const DEFAULT_HIGHLIGHT_COLOR = '#f7feff';
const PURIFY_IDLE_DELAY = 20; // seconds
const PURIFY_DURATION = 40; // seconds to fully purify once triggered
const INK_LIFETIME = 14; // seconds
const INK_MAX = 16;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

export class FluidSimulator {
  constructor() {
    this.renderState = {
      rippleCenter: { x: 0.5, y: 0.5 },
      deleteMix: 0,
      energy: 0,
      baseColor: DEFAULT_BASE_COLOR,
      highlightColor: DEFAULT_HIGHLIGHT_COLOR,
      autoPurifyProgress: 0,
      inkDrops: [],
      audioAmplitude: 0,
      pointerEnergy: 0,
      audioPeak: 0,
    };

    this.deleteActive = false;
    this.audioEnergy = 0;
    this.pointerEnergy = 0;
    this.keyboardEnergy = 0;

    this.lastInputTime = performance.now();
    this.autoPurifyProgress = 0;

    this.textEntries = [];

    this.inkDrops = [];

    this.lastAudioPeak = 0;
  }

  markInput() {
    this.lastInputTime = performance.now();
    this.autoPurifyProgress = 0;
  }

  injectPointerForce(payload) {
    if (!payload) return;
    this.markInput();

    if (payload.position) {
      this.renderState.rippleCenter = {
        x: payload.position.x,
        y: payload.position.y,
      };
    }

    this.pointerEnergy = clamp(payload.speed ?? 0.2, 0, 1);

    if (payload.isInjection) {
      this.addInkDrop(payload.position, payload.color);
    }
  }

  injectKeyRipple(payload) {
    if (!payload) return;
    this.markInput();

    if (payload.position) {
      this.renderState.rippleCenter = {
        x: payload.position.x,
        y: payload.position.y,
      };
    }

    this.keyboardEnergy = clamp(payload.strength ?? 0.5, 0, 1);
  }

  handleRecognizedText(payload) {
    if (!payload) return;
    this.markInput();

    this.textEntries.push({
      text: payload.text,
      timestamp: Date.now(),
    });

    // Slightly bump energy to visualize the recognition for now.
    this.keyboardEnergy = Math.max(this.keyboardEnergy, 0.3);
  }

  applyAudioEnergy({ amplitude = 0, frequency = 0 } = {}) {
    this.audioEnergy = clamp(amplitude, 0, 1);
    this.renderState.audioFrequency = frequency;
    this.renderState.audioAmplitude = this.audioEnergy;
    this.lastAudioPeak = Math.max(this.lastAudioPeak * 0.9, this.audioEnergy);
    this.renderState.audioPeak = this.lastAudioPeak;
  }

  setDeleteMode(active) {
    if (this.deleteActive === active) return;
    this.deleteActive = active;
    this.markInput();
  }

  update(delta) {
    const now = performance.now();
    const secondsSinceInput = (now - this.lastInputTime) / 1000;

    if (secondsSinceInput > PURIFY_IDLE_DELAY) {
      const t = (secondsSinceInput - PURIFY_IDLE_DELAY) / PURIFY_DURATION;
      this.autoPurifyProgress = clamp(t, 0, 1);
    } else {
      this.autoPurifyProgress = 0;
    }

    // Decay energies.
    const decay = Math.pow(0.4, delta);
    this.pointerEnergy *= decay;
    this.keyboardEnergy *= decay;

    const blendedEnergy =
      this.pointerEnergy * 0.5 + this.keyboardEnergy * 0.3 + this.audioEnergy * 0.2;
    this.renderState.energy = lerp(this.renderState.energy, blendedEnergy, 0.15);
    this.renderState.pointerEnergy = this.pointerEnergy;

    const deleteMixTarget = this.deleteActive ? 1 : 0;
    this.renderState.deleteMix = lerp(this.renderState.deleteMix, deleteMixTarget, 0.08);

    this.renderState.autoPurifyProgress = lerp(
      this.renderState.autoPurifyProgress,
      this.autoPurifyProgress,
      0.1,
    );

    if (this.autoPurifyProgress > 0.01) {
      // Ease colors back to default palette during purification.
      this.renderState.baseColor = lerpColor(
        this.renderState.baseColor,
        DEFAULT_BASE_COLOR,
        this.autoPurifyProgress * delta,
      );
      this.renderState.highlightColor = lerpColor(
        this.renderState.highlightColor,
        DEFAULT_HIGHLIGHT_COLOR,
        this.autoPurifyProgress * delta,
      );
    }

    this.updateInkDrops(delta);
  }

  getRenderState() {
    return this.renderState;
  }

  addInkDrop(position, colorPayload) {
    if (!position) return;
    const now = performance.now();
    const baseHex = colorPayload?.base ?? '#FFA500';
    const ink = {
      x: position.x,
      y: position.y,
      color: baseHex,
      bornAt: now,
      life: INK_LIFETIME * 1000,
    };

    this.inkDrops.push(ink);
    if (this.inkDrops.length > INK_MAX) {
      this.inkDrops.shift();
    }
  }

  updateInkDrops(delta) {
    const now = performance.now();
    const center = this.renderState.rippleCenter;
    const alive = [];
    for (let i = 0; i < this.inkDrops.length; i += 1) {
      const drop = this.inkDrops[i];
      const ageMs = now - drop.bornAt;
      if (ageMs <= drop.life) {
        const age = ageMs / drop.life;

        // pointerEnergy が高いときは中心付近で渦をつくるように位置を少し回転させる
        const dx = drop.x - center.x;
        const dy = drop.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1e-5;
        const swirlStrength = this.pointerEnergy * Math.exp(-dist * 6) * 2.5;
        const angle = swirlStrength * delta;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const rx = dx * cosA - dy * sinA;
        const ry = dx * sinA + dy * cosA;

        const newX = clamp(center.x + rx, 0, 1);
        const newY = clamp(center.y + ry, 0, 1);

        const jitter = 0.02 * (1 - age);
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;

        alive.push({
          ...drop,
          x: clamp(newX + jx, 0, 1),
          y: clamp(newY + jy, 0, 1),
          age,
        });
      }
    }
    this.inkDrops = alive;
    this.renderState.inkDrops = alive.map((drop) => ({
      x: drop.x,
      y: drop.y,
      color: drop.color,
      age: drop.age,
    }));
  }
}

function lerpColor(currentHex, targetHex, t) {
  const c = hexToRGB(currentHex);
  const target = hexToRGB(targetHex);
  const mixed = {
    r: Math.round(lerp(c.r, target.r, t)),
    g: Math.round(lerp(c.g, target.g, t)),
    b: Math.round(lerp(c.b, target.b, t)),
  };
  return rgbToHex(mixed);
}

function hexToRGB(hex) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) => {
      const clamped = clamp(value, 0, 255);
      const hex = clamped.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    })
    .join('')}`;
}
