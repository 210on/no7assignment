export class TextOverlay {
  constructor(rootElement, { getAudioLevel, getWaterEnergy } = {}) {
    this.rootElement = rootElement;
    this.getAudioLevel = getAudioLevel;
    this.getWaterEnergy = getWaterEnergy;
    this.layer = this.createLayer();
    this.items = [];
    this.recentTexts = new Map();
  }

  createLayer() {
    const el = document.createElement('div');
    el.className = 'text-layer';
    this.rootElement.appendChild(el);
    return el;
  }

  addText(text, { intensity } = {}) {
    if (!text) return;
    const now = performance.now();
    const lastTime = this.recentTexts.get(text);
    // 同じ文言が短時間に何度も出てこないように抑制する
    if (lastTime && now - lastTime < 4000) {
      return;
    }

    this.recentTexts.set(text, now);
    // 古いエントリを掃除
    this.recentTexts.forEach((ts, key) => {
      if (now - ts > 15000) {
        this.recentTexts.delete(key);
      }
    });

    const item = document.createElement('div');
    item.className = 'text-layer__item';
    item.textContent = text;

    const rect = this.rootElement.getBoundingClientRect();
    // 声の大きさにあわせてフォントサイズとウェイトを変化させる
    const sensedLevel =
      typeof intensity === 'number'
        ? intensity
        : typeof this.getAudioLevel === 'function'
          ? this.getAudioLevel()
          : 0;
    const audioLevel = Math.max(0, Math.min(sensedLevel * 1.6, 1));
    const sizeFactor = 0.18 + audioLevel * 0.4; // ベースのスケール係数
    const rawFontPx = rect.width * sizeFactor;
    const maxFontPx = rect.width / 4.2; // 画面幅いっぱいで全角4文字弱が入るくらい
    const minFontPx = rect.width * 0.08; // 小さすぎない下限
    const fontPx = Math.max(minFontPx, Math.min(rawFontPx, maxFontPx));
    const weight = 200 + Math.round(audioLevel * 700); // 200〜900
    item.style.fontSize = `${fontPx}px`;
    item.style.fontWeight = weight;

    // テキストの中心座標を画面中央 50% の範囲内でランダムにとる
    // （left/top はテキストの中心として扱い、transform で -50% ずらす）
    const centerMinX = rect.width * 0.25;
    const centerMaxX = rect.width * 0.75;
    const centerMinY = rect.height * 0.25;
    const centerMaxY = rect.height * 0.75;
    // テキストの中心座標をプール内に制限
    const poolMinX = rect.width * 0.08;
    const poolMaxX = rect.width * 0.92;
    const poolMinY = rect.height * 0.16;
    const poolMaxY = rect.height * 0.88;
    // プール内に収まるように座標を制限
    const x = Math.max(poolMinX, Math.min(centerMinX + Math.random() * (centerMaxX - centerMinX), poolMaxX));
    const y = Math.max(poolMinY, Math.min(centerMinY + Math.random() * (centerMaxY - centerMinY), poolMaxY));
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;

    this.layer.appendChild(item);

    // 出現アニメーション
    requestAnimationFrame(() => {
      item.classList.add('text-layer__item--visible');
    });

    const energy = typeof this.getWaterEnergy === 'function' ? this.getWaterEnergy() : 0;
    const baseLife = 9000; // ms
    const minLife = 3500;
    const life = Math.max(minLife, baseLife * (1 - energy));

    // 水面の動きに応じて、ふにゃふにゃと溶けていくアニメーション
    setTimeout(() => {
      item.classList.add('text-layer__item--dissolve');
    }, life * 0.35);

    const createdAt = performance.now();
    this.items.push({ element: item, baseX: x, baseY: y, seed: Math.random() * 1000, createdAt });

    setTimeout(() => {
      if (item.parentNode === this.layer) {
        this.layer.removeChild(item);
      }
      this.items = this.items.filter((entry) => entry.element !== item);
    }, life + 2000);
  }

  update(time, state) {
    if (!this.items.length) return;
    const rect = this.rootElement.getBoundingClientRect();
    const energy = typeof this.getWaterEnergy === 'function' ? this.getWaterEnergy() : state?.energy ?? 0;
    const ripple = state?.rippleCenter ?? { x: 0.5, y: 0.5 };
    const pointerEnergy = state?.pointerEnergy ?? 0;

    const cx = ripple.x * rect.width;
    const cy = (1 - ripple.y) * rect.height;

    this.items.forEach((item, index) => {
      const { element, baseX, baseY, seed, createdAt } = item;
      if (!element.parentNode) return;

      const ageSec = (performance.now() - createdAt) / 1000;
      const waveAmp = 4 + energy * 20;
      const dxWave = Math.sin(time * 1.3 + seed + index * 0.2) * waveAmp;
      const dyWave = Math.cos(time * 0.9 + seed * 1.3) * waveAmp * 0.7;

      let x = baseX + dxWave;
      let y = baseY + dyWave;

      if (pointerEnergy > 0.05) {
        const vx = baseX - cx;
        const vy = baseY - cy;
        const dist = Math.sqrt(vx * vx + vy * vy) + 1e-5;
        const swirlFalloff = Math.exp(-dist / (220 + energy * 180));
        const swirlAngle = pointerEnergy * swirlFalloff * (1.4 + 0.4 * Math.sin(time + seed));
        const cosA = Math.cos(swirlAngle);
        const sinA = Math.sin(swirlAngle);
        const rx = vx * cosA - vy * sinA;
        const ry = vx * sinA + vy * cosA;

        x = cx + rx + dxWave;
        y = cy + ry + dyWave;
      }

      element.style.left = `${x}px`;
      element.style.top = `${y}px`;

      const wobble = 0.06 + energy * 0.14;
      const sx = 1 + wobble * Math.sin(time * 2 + seed * 1.7);
      const sy = 1 + wobble * Math.cos(time * 1.6 + seed * 1.1);
      const skew = wobble * 20 * Math.sin(time * 1.1 + seed);
      const floatY = 4 * Math.sin(time * 0.7 + seed + ageSec * 0.4);

      element.style.transform = `translate(-50%, -50%) translateY(${floatY}px) scale(${sx}, ${sy}) skewX(${skew}deg)`;
    });
  }
}
