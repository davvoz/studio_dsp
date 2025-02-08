import Observable from './Observable.js';

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.components = new Map();
        this.state = new Observable('stopped');
        this.masterGain = null;
    }

    async initialize() {
        try {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            
            // Set initial master volume
            this.masterGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
            
            await this.audioContext.resume();
            this.state.value = 'running';
            
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioEngine:', error);
            return false;
        }
    }

    registerComponent(component) {
        if (!this.audioContext) {
            throw new Error('AudioEngine not initialized');
        }
        this.components.set(component.id, component);
        component.initialize(this.audioContext);
    }

    unregisterComponent(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            component.dispose();
            this.components.delete(componentId);
        }
    }

    suspend() {
        this.audioContext.suspend();
        this.state.value = 'suspended';
    }

    resume() {
        this.audioContext.resume();
        this.state.value = 'running';
    }
}

export default AudioEngine;
