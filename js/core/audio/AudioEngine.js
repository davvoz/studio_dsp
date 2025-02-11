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
            
            // Registra l'engine come listener del transport
            this.transport.addListener({
                onTransportEvent: (event, data) => {
                    if (event === 'stop') {
                        this.handleStop();
                    }
                }
            });

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioEngine:', error);
            throw error;
        }
    }

    handleStop() {
        this.components.forEach(component => {
            // Chiamiamo reset se disponibile, altrimenti stop
            if (typeof component.reset === 'function') {
                component.reset();
            } else if (typeof component.stop === 'function') {
                component.stop();
            }
        });
        
        if (this.audioContext.state === 'running') {
            this.audioContext.suspend();
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
