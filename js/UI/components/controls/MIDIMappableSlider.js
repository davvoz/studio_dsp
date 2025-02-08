export default class MIDIMappableSlider {
    constructor(options) {
        this.id = options.id;
        this.min = options.min || 0;
        this.max = options.max || 127;
        this.step = options.step || 1;
        this.value = options.initialValue || 0;
        this.label = options.label || '';
        this.midiCC = null; // Rimuovi il mapping preimpostato
        this.onChange = options.onChange;
        this.onMIDIMessage = options.onMIDIMessage;
        this.midiManager = options.midiManager;
        this.isLearning = false;
        
        this.element = null;
        this.slider = null;
        this.valueDisplay = null;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'slider-control';

        // Label
        const labelElement = document.createElement('label');
        labelElement.textContent = this.label;
        this.element.appendChild(labelElement);

        // Slider
        this.slider = document.createElement('input');
        this.slider.type = 'range';
        this.slider.min = this.min;
        this.slider.max = this.max;
        this.slider.step = this.step;
        this.slider.value = this.value;
        
        // Value display
        this.valueDisplay = document.createElement('span');
        this.valueDisplay.className = 'slider-value';
        this.updateValueDisplay();

        // Events
        this.slider.addEventListener('input', (e) => {
            this.value = parseFloat(e.target.value);
            this.updateValueDisplay();
            if (this.onChange) {
                this.onChange(this.value);
            }
        });

        // Aggiungi il pulsante MIDI Learn
        const midiLearnBtn = document.createElement('button');
        midiLearnBtn.className = 'midi-learn-btn';
        midiLearnBtn.textContent = 'MIDI Learn';
        midiLearnBtn.addEventListener('click', () => this.toggleMIDILearn());
        
        // Aggiungi l'indicatore di mapping MIDI
        this.midiIndicator = document.createElement('span');
        this.midiIndicator.className = 'midi-indicator';
        this.updateMIDIIndicator();

        this.element.appendChild(this.slider);
        this.element.appendChild(this.valueDisplay);
        this.element.appendChild(midiLearnBtn);
        this.element.appendChild(this.midiIndicator);

        return this.element;
    }

    setValue(value) {
        this.value = parseFloat(value);
        if (this.slider) {
            this.slider.value = this.value;
            this.updateValueDisplay();
        }
    }

    updateValueDisplay() {
        if (this.valueDisplay) {
            this.valueDisplay.textContent = this.value.toFixed(2);
        }
    }

    toggleMIDILearn() {
        this.isLearning = !this.isLearning;
        if (this.isLearning) {
            this.midiManager.startLearning(this);
        } else {
            this.stopMIDILearn();
        }
        this.element.classList.toggle('midi-learning', this.isLearning);
    }

    stopMIDILearn() {
        this.isLearning = false;
        this.element.classList.remove('midi-learning');
        this.midiManager.stopLearning();
    }

    handleMIDIMessage(message) {
        const [status, cc, value] = message.data;
        const messageType = status >> 4;
        const channel = status & 0x0F;

        console.log('Slider receiving MIDI:', {
            id: this.id,
            messageType: messageType.toString(16),
            channel,
            cc,
            value,
            isLearning: this.isLearning,
            currentMapping: this.midiMapping
        });

        if (messageType !== 0xB) {
            return false;
        }

        if (this.isLearning) {
            this.midiMapping = { channel, cc };
            this.midiManager.setMapping(message, this);
            this.updateMIDIIndicator();
            this.stopMIDILearn();
            return true;
        }

        // Verifica sia il CC che il canale
        if (this.midiMapping && 
            this.midiMapping.cc === cc && 
            this.midiMapping.channel === channel) {
            const normalizedValue = (value / 127) * (this.max - this.min) + this.min;
            this.setValue(normalizedValue);
            if (this.onChange) {
                this.onChange(normalizedValue);
            }
            return true;
        }
        return false;
    }

    clearMIDIMapping() {
        this.midiCC = null;
        this.updateMIDIIndicator();
    }

    updateMIDIIndicator() {
        this.midiIndicator.textContent = this.midiMapping ? 
            `MIDI ${this.midiMapping.channel}:${this.midiMapping.cc}` : 
            'No MIDI mapping';
    }

    getValue() {
        return parseFloat(this.value);
    }

    setDisabled(disabled) {
        if (this.slider) {
            this.slider.disabled = disabled;
        }
    }
}
