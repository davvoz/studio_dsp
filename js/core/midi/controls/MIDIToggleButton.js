import AbstractMIDIControl from './AbstractMIDIControl.js';

export default class MIDIToggleButton extends AbstractMIDIControl {
    constructor(options = {}) {
        super(options);
        this.toggleThreshold = options.toggleThreshold || 64;
        this.isOn = false;
        this.wasPressed = false;
        this.onToggleOn = options.onToggleOn || (() => {});
        this.onToggleOff = options.onToggleOff || (() => {});
    }

    setValue(value) {
        super.setValue(value);
        
        const isPressed = value >= this.toggleThreshold;
        
        if (isPressed && !this.wasPressed) {
            this.isOn = !this.isOn;
            if (this.isOn) {
                this.onToggleOn(value);
            } else {
                this.onToggleOff(value);
            }
        }
        
        this.wasPressed = isPressed;
    }

    getState() {
        return this.isOn;
    }

    setState(state) {
        if (this.isOn !== state) {
            this.isOn = state;
            if (state) {
                this.onToggleOn(this.value);
            } else {
                this.onToggleOff(this.value);
            }
        }
    }

    toggle() {
        this.setState(!this.isOn);
    }
}
