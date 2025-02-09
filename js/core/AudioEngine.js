import Observable from './Observable.js';

export default class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.components = new Map();
        this.transport = null;
        this.masterGain = null;
    }

    async initialize() {
        try {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
            
            // Transport verrà creato da TransportPanel
            await this.audioContext.resume();
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioEngine:', error);
            return false;
        }
    }

    registerComponent(component) {
        if (!component || !component.id) return;
        console.log(`Registering component: ${component.id}`);
        this.components.set(component.id, component);
        
        // Non inizializzare automaticamente i componenti audio
        // component.initialize(this.audioContext);
    }

    unregisterComponent(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            console.log(`Unregistering component: ${componentId}`);
            if (typeof component.dispose === 'function') {
                component.dispose();
            }
            this.components.delete(componentId);
        }
    }

    getTransport() {
        return this.transport;
    }

    setTransport(transport) {
        this.transport = transport;
    }
}
