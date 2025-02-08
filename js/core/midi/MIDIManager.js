export default class MIDIManager {
    constructor() {
        this.midiAccess = null;
        this.inputs = new Map();
        this.outputs = new Map();
        this.controls = new Map();
        this.isInitialized = false;
        this.eventListeners = new Map();
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
            input.onmidimessage = this.handleMIDIMessage.bind(this);
        });
    }

    handleStateChange(event) {
        const port = event.port;
        const portMap = port.type === 'input' ? this.inputs : this.outputs;

        if (port.state === 'connected') {
            portMap.set(port.id, port);
        } else {
            portMap.delete(port.id);
        }

        if (port.type === 'input') {
            port.onmidimessage = this.handleMIDIMessage.bind(this);
        }
    }

    handleMIDIMessage(message) {
        this.emit('message', message);
        this.controls.forEach(control => {
            control.handleMIDIMessage(message);
        });
    }

    registerControl(id, control) {
        this.controls.set(id, control);
    }

    unregisterControl(id) {
        this.controls.delete(id);
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
