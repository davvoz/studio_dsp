import Slider from './Slider.js';
import createMIDIMappableControl from './MIDIMappableControl.js';

export default class MIDIMappableSlider extends createMIDIMappableControl(Slider) {
    scaleMIDIValue(value) {
        // Scala il valore MIDI (0-127) al range dello slider
        return this.min + (value / 127) * (this.max - this.min);
    }
}
