import * as THREE from 'three';

const INK_MAX = 16;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uDeleteMix;
  uniform float uEnergy;
  uniform vec2 uRippleCenter;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;
  uniform vec3 uDepthColor;
  uniform int uInkCount;
  uniform vec2 uInkPos[${INK_MAX}];
  uniform vec3 uInkColor[${INK_MAX}];
  uniform float uInkAge[${INK_MAX}];

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // 擬似的な高さ場を定義して、水面法線やレーンの構造を作る。
  float heightField(vec2 p) {
    // ゆっくり揺れるベースのうねり
    float base = noise(p * 2.0 + uTime * 0.1);
    base += 0.5 * noise(p * 5.0 - uTime * 0.25);

    // 中心付近のさざなみ
    float detail = 0.35 * noise(p * 16.0 + uTime * 0.6);

    // インタラクション由来の波紋（クリック位置中心）
    float d = distance(p, uRippleCenter);
    float wave = 0.0;
    float hitRadius = mix(0.15, 0.4, 1.0 - uEnergy);
    if (d < hitRadius) {
      float phase = d * 36.0 - uTime * 9.0;
      wave = sin(phase) * exp(-d * 10.0) * (0.7 + uEnergy * 1.3);
    }

    // 壁での跳ね返りを簡易的に表現するため、リップル中心をプールの4隅にミラーリング
    vec2 rc = uRippleCenter;
    vec2 mirror1 = vec2(1.0 - rc.x, rc.y);
    vec2 mirror2 = vec2(rc.x, 1.0 - rc.y);
    vec2 mirror3 = vec2(1.0 - rc.x, 1.0 - rc.y);

    float d1 = distance(p, mirror1);
    float d2 = distance(p, mirror2);
    float d3 = distance(p, mirror3);

    float edgePhaseOffset = 0.7;
    wave += 0.45 * sin(d1 * 32.0 - uTime * 8.0 - edgePhaseOffset) * exp(-d1 * 9.0);
    wave += 0.45 * sin(d2 * 32.0 - uTime * 8.0 - edgePhaseOffset) * exp(-d2 * 9.0);
    wave += 0.35 * sin(d3 * 30.0 - uTime * 7.0 - edgePhaseOffset) * exp(-d3 * 8.0);

    // Deleteモード時は流れが重くなりつつ、うねりが強調される
    float viscosityBoost = mix(0.0, 0.4, uDeleteMix);

    return base * (0.7 + viscosityBoost) + detail + wave;
  }

  vec3 applyInk(vec2 uv, vec3 baseColor) {
    vec3 outColor = baseColor;
    for (int i = 0; i < ${INK_MAX}; i++) {
      if (i >= uInkCount) {
        break;
      }
      float age = clamp(uInkAge[i], 0.0, 1.0);
      float radius = mix(0.03, 0.2, age);
      float d = distance(uv, uInkPos[i]);
      float falloff = exp(-pow(d / radius, 2.0));
      float alpha = (1.0 - age) * falloff * 0.9;
      vec3 inkCol = uInkColor[i];
      outColor = mix(outColor, inkCol, alpha);
    }
    return outColor;
  }

  void main() {
    vec2 uv = vUv;

    // プール矩形（画面内に収まるように少し余白をとる）
    vec2 poolMin = vec2(0.08, 0.16);
    vec2 poolMax = vec2(0.92, 0.88);
    vec2 poolSize = poolMax - poolMin;
    float inPool = step(poolMin.x, uv.x) * step(poolMin.y, uv.y) * step(uv.x, poolMax.x) * step(uv.y, poolMax.y);
    vec2 poolUv = (uv - poolMin) / poolSize;
    poolUv = clamp(poolUv, 0.0, 1.0);

    // 高さ場と法線を数値微分から計算（プール内部のローカル座標で）
    float h = heightField(poolUv);
    float hx = heightField(poolUv + vec2(0.002, 0.0));
    float hy = heightField(poolUv + vec2(0.0, 0.002));
    vec3 normal = normalize(vec3(hx - h, hy - h, 0.18));

    // プールのレーン（黒いライン＋赤いターンライン）
    float laneLine = smoothstep(0.48, 0.495, abs(fract(poolUv.x * 8.0) - 0.5));
    float laneBody = smoothstep(0.0, 0.06, laneLine);

    // 深さ方向のグラデーション（中心ほど明るく透き通る）
    float vignette = smoothstep(0.5, 0.0, length(poolUv - 0.5));
    vec3 clearBase = mix(uDepthColor, uBaseColor, 0.55 + 0.45 * vignette);

    // レーンライン（黒）とターン用赤帯
    float laneMask = 1.0 - laneBody * 0.7;
    vec3 poolBase = clearBase * laneMask;
    float redBandTop = smoothstep(0.03, 0.035, poolUv.y) * (1.0 - smoothstep(0.06, 0.065, poolUv.y));
    float redBandBottom = smoothstep(0.93, 0.935, poolUv.y) * (1.0 - smoothstep(0.96, 0.965, poolUv.y));
    float redBand = max(redBandTop, redBandBottom) * (1.0 - laneBody * 0.3);
    poolBase = mix(poolBase, vec3(0.88, 0.2, 0.32), redBand * 0.8);

    // 空の色（反射用）
    vec3 skyTop = vec3(0.58, 0.82, 1.0);
    vec3 skyHorizon = vec3(0.8, 0.93, 1.0);
    float skyT = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 skyColor = mix(skyHorizon, skyTop, skyT);

    // Fresnel で反射と屈折をブレンド（透き通り優先）
    float fresnel = pow(1.0 - max(normal.z, 0.0), 3.0);
    vec3 highlight = uHighlightColor * (0.25 + 0.7 * uEnergy);
    vec3 refracted = poolBase + highlight * (0.12 + 0.22 * h);
    vec3 reflected = skyColor + highlight * 0.15;

    vec3 waterColor = mix(refracted, reflected, fresnel);

    // クリック付近のささやかな水しぶき／泡
    float dRipple = distance(poolUv, (uRippleCenter - poolMin) / poolSize);
    float splash = exp(-dRipple * 100.0) * (0.25 + 0.8 * uEnergy);
    vec3 foamColor = vec3(1.0);
    waterColor = mix(waterColor, foamColor, clamp(splash, 0.0, 0.6));

    // ローカルなインクの滲みを重ねる（プール内部のみ）
    vec3 color = applyInk(poolUv, waterColor);

    // プール外側のデッキ部分
    vec2 deckUv = uv;
    vec3 deckBase = vec3(0.78, 0.43, 0.32);
    float brick = step(0.5, fract(deckUv.x * 16.0 + floor(deckUv.y * 8.0)));
    deckBase *= 0.9 + 0.08 * brick;
    // プール縁の白いフレーム
    float frame = 1.0 - step(poolMin.x, uv.x) * step(poolMin.y, uv.y) * step(uv.x, poolMax.x) * step(uv.y, poolMax.y);
    float border = smoothstep(0.0, 0.015, min(abs(uv.x - poolMin.x), abs(uv.x - poolMax.x))) +
                  smoothstep(0.0, 0.015, min(abs(uv.y - poolMin.y), abs(uv.y - poolMax.y)));
    vec3 deckColor = deckBase;
    deckColor = mix(deckColor, vec3(0.97, 0.97, 0.98), clamp(border, 0.0, 1.0));

    // デッキ側の影（上端に木陰が落ちているイメージ）
    float shadow = smoothstep(0.0, 0.18, deckUv.y) * 0.25;
    deckColor *= 1.0 - shadow;

    // プール内外をブレンド
    float poolMask = inPool;
    vec3 finalColor = mix(deckColor, color, poolMask);

    finalColor = clamp(finalColor, 0.0, 1.0);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class WaterRenderer {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.canvas = this.renderer.domElement;
    this.canvas.classList.add('water-surface');
    this.rootElement.appendChild(this.canvas);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uDeleteMix: { value: 0 },
        uEnergy: { value: 0 },
        uRippleCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uBaseColor: { value: new THREE.Color('#5ad5ff') },
        uHighlightColor: { value: new THREE.Color('#f5ffff') },
        uDepthColor: { value: new THREE.Color('#0082b9') },
        uInkCount: { value: 0 },
        uInkPos: { value: Array.from({ length: INK_MAX }, () => new THREE.Vector2(0.5, 0.5)) },
        uInkColor: { value: Array.from({ length: INK_MAX }, () => new THREE.Color('#000000')) },
        uInkAge: { value: new Float32Array(INK_MAX) },
      },
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  setSize(width, height) {
    this.renderer.setSize(width, height, false);
  }

  render(time, state) {
    if (!state) return;

    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uDeleteMix.value = state.deleteMix ?? 0;
    this.material.uniforms.uEnergy.value = state.energy ?? 0;
    this.material.uniforms.uRippleCenter.value.set(
      state.rippleCenter?.x ?? 0.5,
      state.rippleCenter?.y ?? 0.5,
    );

    if (state.baseColor) {
      this.material.uniforms.uBaseColor.value.set(state.baseColor);
    }
    if (state.highlightColor) {
      this.material.uniforms.uHighlightColor.value.set(state.highlightColor);
    }
    if (state.depthColor) {
      this.material.uniforms.uDepthColor.value.set(state.depthColor);
    }

    const inkDrops = state.inkDrops ?? [];
    const count = Math.min(inkDrops.length, INK_MAX);
    this.material.uniforms.uInkCount.value = count;
    const posArray = this.material.uniforms.uInkPos.value;
    const colorArray = this.material.uniforms.uInkColor.value;
    const ageArray = this.material.uniforms.uInkAge.value;

    for (let i = 0; i < INK_MAX; i += 1) {
      if (i < count) {
        const drop = inkDrops[i];
        posArray[i].set(drop.x, drop.y);
        colorArray[i].set(drop.color);
        ageArray[i] = drop.age;
      } else {
        ageArray[i] = 1.0;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
