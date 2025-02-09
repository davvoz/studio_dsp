import Transport from './transport/Transport.js';

export default class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.components = new Map();
        this.transport = null;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.transport = new Transport(this.audioContext);
            this.initialized = true;  // Moved before return
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioEngine:', error);
            throw error;
        }
    }

    getTransport() {
        return this.transport;
    }

    registerComponent(component) {
        this.components.set(component.id, component);
    }

    unregisterComponent(componentId) {
        this.components.delete(componentId);
    }
}
