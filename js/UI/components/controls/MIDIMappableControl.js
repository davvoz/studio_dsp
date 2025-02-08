import Observable from '../../../core/Observable.js';

export default function createMIDIMappableControl(BaseControl) {
    return class MIDIMappableControl extends BaseControl {
        constructor(options = {}) {
            super(options);
            this.midiChannel = new Observable(options.midiChannel || null);
            this.midiControl = new Observable(options.midiControl || null);
            this.midiMapping = new Observable(null);
            this.isLearning = new Observable(false);
            this.setupMIDIMapping();
        }

        setupMIDIMapping() {
            // Crea il badge MIDI
            this.midiBadge = document.createElement('div');
            this.midiBadge.className = 'midi-mapping-badge';
            this.updateMIDIBadge();

            // Gestisce gli aggiornamenti del mapping
            this.midiMapping.subscribe(mapping => {
                this.updateMIDIBadge();
                if (mapping) {
                    this.midiChannel.value = mapping.channel;
                    this.midiControl.value = mapping.control;
                }
            });

            // Gestisce lo stato di MIDI learn
            this.isLearning.subscribe(learning => {
                this.midiBadge.classList.toggle('learning', learning);
            });
        }

        updateMIDIBadge() {
            const mapping = this.midiMapping.value;
            this.midiBadge.textContent = mapping 
                ? `MIDI ${mapping.channel}:${mapping.control}` 
                : 'Click to map MIDI';
        }

        startMIDILearn() {
            this.isLearning.value = true;
        }

        stopMIDILearn() {
            this.isLearning.value = false;
        }

        handleMIDIMessage(message) {
            if (this.isLearning.value) {
                const [status, control, value] = message.data;
                const channel = status & 0x0F;
                this.midiMapping.value = { channel, control };
                this.stopMIDILearn();
                return true;
            }

            if (this.midiMapping.value) {
                const [status, control, value] = message.data;
                const channel = status & 0x0F;
                if (channel === this.midiMapping.value.channel && 
                    control === this.midiMapping.value.control) {
                    this.setValue(this.scaleMIDIValue(value));
                    return true;
                }
            }
            return false;
        }

        scaleMIDIValue(value) {
            // Override questo metodo nelle sottoclassi se necessario
            return value;
        }

        createElement() {
            const container = document.createElement('div');
            container.className = 'midi-mappable-control';
            
            // Crea il controllo base
            const baseElement = super.createElement();
            container.appendChild(baseElement);
            
            // Aggiunge il badge MIDI
            container.appendChild(this.midiBadge);
            
            // Aggiunge il listener per il MIDI learn
            this.midiBadge.addEventListener('click', () => {
                if (!this.isLearning.value) {
                    this.startMIDILearn();
                } else {
                    this.stopMIDILearn();
                }
            });

            return container;
        }
    };
}
