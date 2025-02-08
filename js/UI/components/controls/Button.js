import AbstractControl from './AbstractControl.js';
import Observable from '../../../core/Observable.js';

export default class Button extends AbstractControl {
    constructor(options = {}) {
        super(options);
        this.text = options.text || '';
        this.onClick = options.onClick || (() => {});
        this.type = options.type || 'default'; // default, toggle, trigger
        this.active$ = new Observable(false);
    }

    createElement() {
        const button = document.createElement('button');
        button.id = this.id;
        button.className = `control-button ${this.type}-button ${this.className}`;
        button.textContent = this.text;
        
        return button;
    }

    setupEventListeners() {
        this.element.addEventListener('click', () => {
            if (!this.disabled$.value) {
                if (this.type === 'toggle') {
                    this.active$.value = !this.active$.value;
                }
                this.onClick(this.active$.value);
            }
        });

        if (this.type === 'trigger') {
            this.element.addEventListener('mousedown', () => {
                if (!this.disabled$.value) {
                    this.active$.value = true;
                }
            });

            this.element.addEventListener('mouseup', () => {
                this.active$.value = false;
            });

            this.element.addEventListener('mouseleave', () => {
                this.active$.value = false;
            });
        }

        this.active$.subscribe(active => {
            this.element.classList.toggle('active', active);
        });

        this.disabled$.subscribe(disabled => {
            this.element.disabled = disabled;
        });
    }
}
