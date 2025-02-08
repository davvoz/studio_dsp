import AbstractMIDIControl from './AbstractMIDIControl.js';

export default class MIDIRange extends AbstractMIDIControl {
    constructor(options = {}) {
        super(options);
        this.minValue = options.minValue || 0;
        this.maxValue = options.maxValue || 127;
        this.step = options.step || 1;
    }

    setValue(value) {
        this.value = this.scaleValue(this.normalizeValue(value));
        this.notifyCallbacks();
    }

    scaleValue(value) {
        return this.minValue + (value / 127) * (this.maxValue - this.minValue);
    }

    unscaleValue(value) {
        return Math.round((value - this.minValue) / (this.maxValue - this.minValue) * 127);
    }

    setFromScaledValue(scaledValue) {
        const value = this.unscaleValue(
            Math.min(Math.max(scaledValue, this.minValue), this.maxValue)
        );
        super.setValue(value);
    }
}
