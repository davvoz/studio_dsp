class AbstractAudioComponent {
    constructor(audioContext) {
        if (this.constructor === AbstractAudioComponent) {
            throw new Error('Cannot instantiate abstract class');
        }
        this.audioContext = audioContext;
        this.inputs = new Set();
        this.outputs = new Set();
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) {
            return;
        }
        this._setupAudioNode();
        this.isInitialized = true;
    }

    _setupAudioNode() {
        throw new Error('_setupAudioNode must be implemented by subclass');
    }

    connect(destination) {
        if (!this.isInitialized) {
            this.initialize();
        }
        this.outputs.add(destination);
        return destination;
    }

    disconnect(destination) {
        if (destination) {
            this.outputs.delete(destination);
        } else {
            this.outputs.clear();
        }
    }

    dispose() {
        this.disconnect();
        this.inputs.clear();
        this.isInitialized = false;
    }

    getContext() {
        return this.audioContext;
    }
}

export default AbstractAudioComponent;
