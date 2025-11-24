export class IntroOverlay {
  constructor(rootElement, onStart) {
    this.rootElement = rootElement;
    this.onStart = onStart;
    this.element = this.create();
  }

  create() {
    const wrapper = document.createElement('div');
    wrapper.className = 'intro-overlay';

    const title = document.createElement('div');
    title.className = 'intro-overlay__title';
    title.textContent = '水面の詩';

    const subtitle = document.createElement('div');
    subtitle.className = 'intro-overlay__subtitle';
    subtitle.textContent = '指先と声で、夏のプールを揺らす。';

    const visuals = document.createElement('div');
    visuals.className = 'intro-overlay__visuals';

    const visualConfigs = [
      { type: 'pointer', label: 'なぞる' },
      { type: 'keyboard', label: 'キー' },
      { type: 'mic', label: '声' },
    ];

    visualConfigs.forEach((cfg) => {
      const box = document.createElement('div');
      box.className = 'intro-overlay__visual';

      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'intro-overlay__visual-icon');
      icon.setAttribute('viewBox', '0 0 24 24');

      if (cfg.type === 'pointer') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 3l6 14 2-5 5-2z');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#0b3556');
        path.setAttribute('stroke-width', '1.6');
        path.setAttribute('stroke-linejoin', 'round');
        icon.appendChild(path);
      } else if (cfg.type === 'keyboard') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '3');
        rect.setAttribute('y', '6');
        rect.setAttribute('width', '18');
        rect.setAttribute('height', '12');
        rect.setAttribute('rx', '2');
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', '#0b3556');
        rect.setAttribute('stroke-width', '1.6');
        icon.appendChild(rect);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '5');
        line.setAttribute('y1', '12');
        line.setAttribute('x2', '19');
        line.setAttribute('y2', '12');
        line.setAttribute('stroke', '#0b3556');
        line.setAttribute('stroke-width', '1.2');
        icon.appendChild(line);
      } else if (cfg.type === 'mic') {
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        body.setAttribute('x', '9');
        body.setAttribute('y', '5');
        body.setAttribute('width', '6');
        body.setAttribute('height', '9');
        body.setAttribute('rx', '3');
        body.setAttribute('fill', 'none');
        body.setAttribute('stroke', '#0b3556');
        body.setAttribute('stroke-width', '1.6');
        icon.appendChild(body);
        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arc.setAttribute('d', 'M7 11a5 5 0 0 0 10 0');
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', '#0b3556');
        arc.setAttribute('stroke-width', '1.6');
        icon.appendChild(arc);
      }

      const label = document.createElement('div');
      label.textContent = cfg.label;

      box.appendChild(icon);
      box.appendChild(label);
      visuals.appendChild(box);
    });

    const list = document.createElement('ul');
    list.className = 'intro-overlay__list';

    const items = [
      'なぞると、水面が渦をつくる',
      'キーを押すと、波紋がひろがる',
      '声をのせると、言葉が水面に浮かぶ',
    ];

    items.forEach((text) => {
      const li = document.createElement('li');
      li.className = 'intro-overlay__list-item';
      li.textContent = text;
      list.appendChild(li);
    });

    const hint = document.createElement('div');
    hint.className = 'intro-overlay__hint';
    hint.textContent = 'クリックしてはじめると、マイクの使用許可ダイアログが表示されます。';

    const cta = document.createElement('div');
    cta.className = 'intro-overlay__cta';
    cta.textContent = 'クリックしてはじめる';

    wrapper.appendChild(title);
    wrapper.appendChild(subtitle);
    wrapper.appendChild(visuals);
    wrapper.appendChild(list);
    wrapper.appendChild(cta);
    wrapper.appendChild(hint);

    wrapper.addEventListener('click', () => this.start());

    this.rootElement.appendChild(wrapper);
    return wrapper;
  }

  start() {
    if (!this.element) return;
    this.element.style.pointerEvents = 'none';
    this.element.style.transition = 'opacity 0.7s ease-out, transform 0.7s ease-out';
    this.element.style.opacity = '0';
    this.element.style.transform = 'translateY(-12px)';

    if (this.onStart) {
      this.onStart();
    }

    window.setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.element = null;
    }, 800);
  }
}
