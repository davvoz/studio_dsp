export default class MIDIManager {
    constructor() {
        this.midiAccess = null;
        this.inputs = new Map();
        this.outputs = new Map();
        this.midiMappings = new Map();
        this.isInitialized = false;
        this.eventListeners = new Map();
        this.learningControl = null;
        this.RESERVED_CCS = new Set([
            7,   // Volume
            10,  // Pan
            11,  // Expression
            64,  // Sustain
            91,  // Reverb
            93   // Chorus
        ]);
        
        // Modifica la struttura per l'APC40 per includere i canali
        this.APC40_RANGES = {
            TRACK_KNOBS: { start: 48, end: 55, channel: 0 },    // Track knobs
            DEVICE_KNOBS: { start: 16, end: 23, channel: 0 },   // Device control knobs
            TRACK_FADERS: { cc: 7, channels: [0, 1, 2, 3, 4, 5, 6, 7] },  // Track faders su canali diversi
            MASTER_FADER: { cc: 14, channel: 0 },
            CUE_LEVEL: { cc: 47, channel: 0 }
        };

        // Modifica i mapping per includere il canale
        this.midiMappings = new Map(); // chiave: "channel:cc", valore: control
    }

    async initialize() {
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.setupMIDIPorts();
            this.setupMIDIListeners();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('MIDI access denied:', error);
            return false;
        }
    }

    setupMIDIPorts() {
        this.inputs = new Map();
        this.outputs = new Map();

        for (const entry of this.midiAccess.inputs) {
            const input = entry[1];
            this.inputs.set(input.id, input);
        }

        for (const entry of this.midiAccess.outputs) {
            const output = entry[1];
            this.outputs.set(output.id, output);
        }
    }

    setupMIDIListeners() {
        this.midiAccess.onstatechange = this.handleStateChange.bind(this);
        
        this.inputs.forEach(input => {
            // Bind the handler to preserve 'this' context
            input.onmidimessage = (message) => this.handleMIDIMessage(message);
        });
    }

    handleStateChange(event) {
        const port = event.port;
        const portMap = port.type === 'input' ? this.inputs : this.outputs;

        if (port.state === 'connected') {
            portMap.set(port.id, port);
            if (port.type === 'input') {
                // Bind the handler to preserve 'this' context
                port.onmidimessage = (message) => this.handleMIDIMessage(message);
            }
        } else {
            portMap.delete(port.id);
        }
    }

    startLearning(control) {
        // Ferma qualsiasi altro controllo in learning
        if (this.learningControl && this.learningControl !== control) {
            this.learningControl.stopMIDILearn();
        }
        this.learningControl = control;
    }

    stopLearning() {
        this.learningControl = null;
    }

    setMapping(message, control) {
        const [status, cc, value] = message.data;
        const channel = status & 0x0F;
        const mappingKey = `${channel}:${cc}`;
        
        console.log('Setting MIDI mapping:', { channel, cc, mappingKey, controlId: control.id });
        
        // Rimuovi vecchi mapping per questo controllo
        this.midiMappings.forEach((mappedControl, key) => {
            if (mappedControl === control) {
                console.log('Removing old mapping:', key);
                mappedControl.clearMIDIMapping();
                this.midiMappings.delete(key);
            }
        });

        // Imposta il nuovo mapping
        this.midiMappings.set(mappingKey, control);
        this.stopLearning();
    }

    handleMIDIMessage(message) {
        const [status, cc, value] = message.data;
        const messageType = status >> 4;
        const channel = status & 0x0F;
        const mappingKey = `${channel}:${cc}`;

        console.log('APC40 MIDI Message:', {
            raw: Array.from(message.data),
            status: status.toString(16),
            messageType: messageType.toString(16),
            channel,
            cc,
            value,
            mappingKey,
            controlType: this.getAPC40ControlType(cc, channel)
        });

        if (messageType !== 0xB) { // Non è un CC message
            return;
        }

        if (this.learningControl) {
            this.learningControl.handleMIDIMessage(message);
            return;
        }

        const mappedControl = this.midiMappings.get(mappingKey);
        if (mappedControl) {
            console.log(`Sending value ${value} to control ${mappedControl.id}`);
            mappedControl.handleMIDIMessage(message);
        }
    }

    getAPC40ControlType(cc, channel) {
        // Controlla prima i fader che usano lo stesso CC ma canali diversi
        if (cc === this.APC40_RANGES.TRACK_FADERS.cc && 
            this.APC40_RANGES.TRACK_FADERS.channels.includes(channel)) {
            return `Track Fader ${channel + 1}`;
        }

        // Poi controlla gli altri controlli
        if (cc >= this.APC40_RANGES.TRACK_KNOBS.start && 
            cc <= this.APC40_RANGES.TRACK_KNOBS.end) {
            return `Track Knob ${cc - this.APC40_RANGES.TRACK_KNOBS.start + 1}`;
        }
        // ...resto dei controlli...

        return 'Other';
    }

    getInputs() {
        return Array.from(this.inputs.values());
    }

    getOutputs() {
        return Array.from(this.outputs.values());
    }

    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(callback);
    }

    off(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).delete(callback);
        }
    }

    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => callback(data));
        }
    }
}
