# 水面の詩/ Poem on Water Surface

インタラクティブなデジタルアート作品。真夏の25mプールの水面を俯瞰視点で描写し、マウス・キーボード・音声入力・環境音によって流体と光が反応します。視覚（WebGL/GLSL）と聴覚（Web Audio / 効果音）を組み合わせ、静寂と揺らぎのコントラストを体験できます。

## 特徴
- WebGL2 + Three.jsでの水面シェーダーと流体シミュレーション土台
- マウス/タッチでの撹拌・インク滴下、キーボード波紋、Delete長押しによる強制浄化
- Web Speech APIからの音声テキスト表示と水面崩壊演出
- Web Audio APIによる振幅/周波数解析と液面全体の上下動
- 自動浄化フェーズとパレット回復、TweakpaneベースのデバッグUI

## 技術スタック
- Vite / ES Modules
- Three.js, p5.js（追加表現・ノイズ用）
- Sass (SCSS) for styling
- Web Audio API, Web Speech API
- Tweakpane for runtime inspection

## セットアップ
### 前提
- Node.js 18+ 推奨

### インストール
```bash
npm install
```

### 開発サーバ
```bash
npm run dev
```
`http://localhost:5173` をブラウザで開き、初回入力でマイク/音声認識の権限を付与してください。

### ビルド
```bash
npm run build
npm run preview # スタティック出力の確認
```

## ディレクトリ構成
```
windsurf-project/
├── public/
│   ├── shaders/        # GLSLファイル（今後追加）
│   └── sounds/         # 効果音アセット
├── src/
│   ├── index.html
│   ├── main.js         # エントリーポイント
│   ├── scss/
│   │   └── main.scss   # グローバルスタイル
│   └── js/
│       ├── core/
│       │   ├── FluidSimulator.js   # エネルギー/浄化ロジック
│       │   └── WaterRenderer.js    # Three.js + Shader
│       ├── interaction/
│       │   ├── MouseHandler.js
│       │   ├── KeyboardHandler.js
│       │   ├── VoiceHandler.js
│       │   └── AudioAnalyzer.js
│       └── ui/
│           └── DebugPanel.js
├── package.json
├── vite.config.js
└── README.md
```

## 実装メモ
- **FluidSimulator**: 実際のGPGPU流体は未実装。現在はエネルギー合成と浄化進行をモック。`update()` 内で入力エネルギーを減衰し `renderState` を更新。
- **WaterRenderer**: シンプルなノイズ＋リップルシェーダーで可視化中。後続で法線マップ生成と屈折/反射式へ差し替え予定。
- **Interaction Layer**:
  - `MouseHandler`: 速度推定 → pointer force / color injection。
  - `KeyboardHandler`: QWERTY座標マッピング + Deleteモード。
  - `VoiceHandler`: SpeechRecognition連携（日本語）。許可ダイアログ前にヒント表示。
  - `AudioAnalyzer`: getUserMedia + AnalyserNodeでRMS/周波数重心を算出。
- **DebugPanel**: 開発モード限定でパレット/ステートをTweakpane表示。

## 今後のロードマップ
1. GPGPU流体パイプライン実装（Velocity/Dye/Pressure ping-pong）
2. 水面レンダリング拡張：屈折、Fresnel、底タイルの屈折投影、泡パーティクル
3. テキスト浮遊＆崩壊エフェクトの実装（SDF or Instanced Mesh）
4. 効果音アセット設計とオーディオ演出（Deleteモードの吸い上げ音等）
5. モバイル最適化、Fallback（WebGL非対応時のガイド）
6. 自動浄化・UIヒントの演出強化（フェード、タイマー表示）

## ライセンス
MIT License
