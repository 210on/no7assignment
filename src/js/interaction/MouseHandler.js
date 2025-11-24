export const COLOR_POOL = [
  { base: '#87CEEB', highlight: '#FFFFE0' },
  { base: '#FFA500', highlight: '#FFD27F' },
  { base: '#39FF14', highlight: '#DBFF14' },
  { base: '#00BFFF', highlight: '#E0FFFF' },
];

export class MouseHandler {
  constructor(canvas, onForce) {
    this.canvas = canvas;
    this.onForce = onForce;
    this.isPointerDown = false;
    this.previous = null;
    this.colorIndex = 0;
    this.customColor = null;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointermove', this.handlePointerMove);

    this.canvas.style.cursor = 'url(/cursor-dropper.svg) 4 20, crosshair';
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
  }

  handlePointerDown(event) {
    this.isPointerDown = true;
    this.canvas.style.cursor = 'url(/cursor-stir.svg) 10 10, grabbing';
    this.emitForce(event, true);
  }

  handlePointerUp() {
    this.isPointerDown = false;
    this.previous = null;
    this.canvas.style.cursor = 'url(/cursor-dropper.svg) 4 20, crosshair';
  }

  handlePointerMove(event) {
    if (!this.isPointerDown) return;
    this.emitForce(event, false);
  }

  emitForce(event, isNew) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const yNorm = (event.clientY - rect.top) / rect.height;
    const y = 1 - yNorm;

    const current = { x, y, t: performance.now() };
    let speed = 0;

    if (this.previous && !isNew) {
      const dx = current.x - this.previous.x;
      const dy = current.y - this.previous.y;
      const dt = (current.t - this.previous.t) / 1000;
      const distance = Math.sqrt(dx * dx + dy * dy);
      speed = dt > 0 ? distance / dt : 0;
    } else {
      speed = 0.2;
    }

    this.previous = current;

    const paletteColor = COLOR_POOL[this.colorIndex];
    const color = this.customColor || paletteColor;

    this.onForce?.({
      position: { x, y },
      speed: Math.min(speed, 3),
      color,
      isInjection: isNew,
    });
  }

  setColorIndex(index) {
    if (typeof index !== 'number') return;
    const len = COLOR_POOL.length;
    this.colorIndex = ((index % len) + len) % len;
  }

  setCustomColor(hex) {
    if (!hex) {
      this.customColor = null;
      return;
    }

    const base = hex;
    const highlight = hex;
    this.customColor = { base, highlight };
  }
}
