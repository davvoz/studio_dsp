import Observable from '../../../core/Observable.js';

export default class AbstractControl {
    constructor(options = {}) {
        this.id = options.id || crypto.randomUUID();
        this.label = options.label || '';
        this.className = options.className || '';
        this.value$ = new Observable(options.initialValue);
        this.element = null;
        this.disabled$ = new Observable(false);
    }

    create() {
        this.element = this.createElement();
        this.setupEventListeners();
        return this.element;
    }

    createElement() {
        throw new Error('createElement must be implemented by subclass');
    }

    setupEventListeners() {
        throw new Error('setupEventListeners must be implemented by subclass');
    }

    setValue(value) {
        this.value$.value = value;
    }

    getValue() {
        return this.value$.value;
    }

    subscribe(callback) {
        return this.value$.subscribe(callback);
    }

    setDisabled(disabled) {
        this.disabled$.value = disabled;
    }
}
