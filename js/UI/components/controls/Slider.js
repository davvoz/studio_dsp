import AbstractControl from './AbstractControl.js';
import Observable from '../../../core/Observable.js';

export default class Slider extends AbstractControl {
    constructor(options = {}) {
        super(options);
        this.min = options.min || 0;
        this.max = options.max || 100;
        this.step = options.step || 1;
    }

    createElement() {
        const container = document.createElement('div');
        container.className = `control-container slider-container ${this.className}`;

        const label = document.createElement('label');
        label.textContent = this.label;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = this.min;
        slider.max = this.max;
        slider.step = this.step;
        slider.value = this.getValue() || this.min;
        slider.id = this.id;

        const value = document.createElement('span');
        value.className = 'value-display';
        value.textContent = slider.value;

        container.appendChild(label);
        container.appendChild(slider);
        container.appendChild(value);

        this.sliderElement = slider;
        this.valueDisplay = value;

        return container;
    }

    setupEventListeners() {
        this.sliderElement.addEventListener('input', (e) => {
            this.setValue(parseFloat(e.target.value));
        });

        this.value$.subscribe(value => {
            this.sliderElement.value = value;
            this.valueDisplay.textContent = value;
        });

        this.disabled$.subscribe(disabled => {
            this.sliderElement.disabled = disabled;
        });
    }
}
