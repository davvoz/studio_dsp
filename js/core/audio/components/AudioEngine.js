export default class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.components = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        this.audioContext = new AudioContext({ latencyHint: 'interactive' });
        console.log('AudioContext created:', this.audioContext.state);
        
        this.initialized = true;
    }

    async start() {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }

        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('AudioContext resumed:', this.audioContext.state);
            } catch (err) {
                console.error('Failed to resume AudioContext:', err);
                throw err;
            }
        }
    }

    registerComponent(component) {
        if (component && component.id) {
            this.components.set(component.id, component);
        }
    }

    unregisterComponent(id) {
        if (id) {
            this.components.delete(id);
        }
    }
}
