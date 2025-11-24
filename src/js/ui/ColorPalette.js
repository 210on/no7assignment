import { COLOR_POOL } from '../interaction/MouseHandler';

export class ColorPalette {
  constructor(rootElement, mouseHandler) {
    this.rootElement = rootElement;
    this.mouseHandler = mouseHandler;
    this.activeIndex = 0;
    this.customColor = '#ff7fb0';
    this.element = this.create();
  }

  create() {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-palette';

    COLOR_POOL.forEach((entry, index) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'color-palette__swatch';
      swatch.style.setProperty('--swatch-base', entry.base);
      swatch.style.setProperty('--swatch-highlight', entry.highlight);
      if (index === this.activeIndex) {
        swatch.classList.add('is-active');
      }
      swatch.addEventListener('click', () => this.select(index));
      wrapper.appendChild(swatch);
    });

    const pickerWrap = document.createElement('div');
    pickerWrap.className = 'color-palette__picker';

    const pickerSwatch = document.createElement('button');
    pickerSwatch.type = 'button';
    pickerSwatch.className = 'color-palette__swatch color-palette__swatch--picker';
    pickerSwatch.title = '好きな色を選ぶ';
    pickerSwatch.style.setProperty('--swatch-base', this.customColor);
    pickerSwatch.style.setProperty('--swatch-highlight', this.customColor);

    const input = document.createElement('input');
    input.type = 'color';
    input.value = this.customColor;
    input.className = 'color-palette__input';

    pickerSwatch.addEventListener('click', () => {
      input.click();
    });

    input.addEventListener('input', () => {
      this.customColor = input.value;
      pickerSwatch.style.setProperty('--swatch-base', this.customColor);
      pickerSwatch.style.setProperty('--swatch-highlight', this.customColor);
      this.applyCustomColor(this.customColor);
    });

    pickerWrap.appendChild(pickerSwatch);
    pickerWrap.appendChild(input);
    wrapper.appendChild(pickerWrap);

    this.rootElement.appendChild(wrapper);
    return wrapper;
  }

  select(index) {
    this.activeIndex = index;
    if (this.mouseHandler && typeof this.mouseHandler.setColorIndex === 'function') {
      this.mouseHandler.setColorIndex(index);
      if (typeof this.mouseHandler.setCustomColor === 'function') {
        this.mouseHandler.setCustomColor(null);
      }
    }

    const swatches = this.element.querySelectorAll('.color-palette__swatch');
    swatches.forEach((el, i) => {
      if (i === index) el.classList.add('is-active');
      else el.classList.remove('is-active');
    });
  }

  applyCustomColor(hex) {
    if (!this.mouseHandler || typeof this.mouseHandler.setCustomColor !== 'function') return;

    this.mouseHandler.setCustomColor(hex);

    const swatches = this.element.querySelectorAll('.color-palette__swatch');
    swatches.forEach((el) => el.classList.remove('is-active'));
  }
}
