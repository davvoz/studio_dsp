export default class AbstractMIDIControl {
    constructor(options = {}) {
        this.midiChannel = options.channel || 0;
        this.controlNumber = options.controlNumber || 0;
        this.value = 0;
        this.isEnabled = true;
        this.callbacks = new Set();
    }

    setValue(value) {
        this.value = this.normalizeValue(value);
        this.notifyCallbacks();
    }

    getValue() {
        return this.value;
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }

    addCallback(callback) {
        this.callbacks.add(callback);
    }

    removeCallback(callback) {
        this.callbacks.delete(callback);
    }

    notifyCallbacks() {
        if (!this.isEnabled) return;
        this.callbacks.forEach(callback => callback(this.value));
    }

    normalizeValue(value) {
        return Math.min(Math.max(value, 0), 127);
    }

    handleMIDIMessage(message) {
        if (!this.isEnabled) return;
        const [status, control, value] = message.data;
        const channel = status & 0x0F;
        
        if (channel === this.midiChannel && control === this.controlNumber) {
            this.setValue(value);
        }
    }
}
