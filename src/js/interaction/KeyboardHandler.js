const KEY_ROWS = [
  '1234567890',
  'QWERTYUIOP',
  'ASDFGHJKL',
  'ZXCVBNM',
];

const normalizePosition = (key) => {
  const upperKey = key.toUpperCase();
  for (let rowIndex = 0; rowIndex < KEY_ROWS.length; rowIndex += 1) {
    const row = KEY_ROWS[rowIndex];
    const colIndex = row.indexOf(upperKey);
    if (colIndex !== -1) {
      const x = (colIndex + 0.5) / row.length;
      const yNorm = (rowIndex + 0.5) / KEY_ROWS.length;
      const y = 1 - yNorm;
      return { x, y };
    }
  }
  // Keys outside the matrix fall back to center.
  return { x: 0.5, y: 0.5 };
};

export class KeyboardHandler {
  constructor({ onRipple, onDeleteToggle } = {}) {
    this.onRipple = onRipple;
    this.onDeleteToggle = onDeleteToggle;
    this.deleteHeld = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(event) {
    if (event.defaultPrevented) return;

    if (event.key === 'Delete') {
      if (!this.deleteHeld) {
        this.deleteHeld = true;
        this.onDeleteToggle?.(true);
      }
      return;
    }

    if (event.repeat) return;

    const pos = normalizePosition(event.key);
    const strength = event.shiftKey ? 0.9 : 0.5;
    this.onRipple?.({ position: pos, strength });
  }

  handleKeyUp(event) {
    if (event.key === 'Delete' && this.deleteHeld) {
      this.deleteHeld = false;
      this.onDeleteToggle?.(false);
    }
  }
}
