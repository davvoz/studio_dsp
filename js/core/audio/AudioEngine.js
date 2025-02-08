export default class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.components = new Map();
    }

    async initialize() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return true;
    }

    registerComponent(component) {
        this.components.set(component.id, component);
    }

    unregisterComponent(componentId) {
        this.components.delete(componentId);
    }
}
