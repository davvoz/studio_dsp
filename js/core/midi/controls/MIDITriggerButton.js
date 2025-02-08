import AbstractMIDIControl from './AbstractMIDIControl.js';

export default class MIDITriggerButton extends AbstractMIDIControl {
    constructor(options = {}) {
        super(options);
        this.triggerThreshold = options.triggerThreshold || 64;
        this.isPressed = false;
        this.onPress = options.onPress || (() => {});
        this.onRelease = options.onRelease || (() => {});
    }

    setValue(value) {
        const previousValue = this.value;
        super.setValue(value);
        
        const isTriggered = value >= this.triggerThreshold;
        
        if (!this.isPressed && isTriggered) {
            this.isPressed = true;
            this.onPress(value);
        } else if (this.isPressed && !isTriggered) {
            this.isPressed = false;
            this.onRelease(value);
        }
    }

    isActive() {
        return this.isPressed;
    }
}
