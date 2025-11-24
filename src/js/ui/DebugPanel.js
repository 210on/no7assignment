import { Pane } from 'tweakpane';

export class DebugPanel {
  constructor({ fluidSimulator, waterRenderer }) {
    this.fluidSimulator = fluidSimulator;
    this.waterRenderer = waterRenderer;
    this.pane = null;

    if (import.meta.env.PROD) return;
    this.initPane();
  }

  initPane() {
    try {
      this.pane = new Pane({ title: 'Water Debug' });
    } catch (e) {
      // 開発用パネルなので、失敗しても作品本体の動作を優先する。
      // eslint-disable-next-line no-console
      console.warn('DebugPanel disabled:', e);
      this.pane = null;
    }
  }
}
