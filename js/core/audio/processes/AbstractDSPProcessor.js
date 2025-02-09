
/**
 * Base class for DSP processors
 */
export default class AbstractDSPProcessor {
    constructor(audioContext, id) {
        if (!audioContext) {
            throw new Error('AudioContext is required');
        }
        this.audioContext = audioContext;
        this.id = id;
        this.isInitialized = false;
        this.parameters = new Map();
    }

    /**
     * Initialize the processor
     */
    async initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;
    }

    /**
     * Add a parameter to the processor
     */
    addParameter(name, defaultValue, min = 0, max = 1) {
        this.parameters.set(name, {
            value: defaultValue,
            min: min,
            max: max
        });
    }

    /**
     * Set a parameter value
     */
    setParameter(name, value) {
        const param = this.parameters.get(name);
        if (param) {
            param.value = Math.min(Math.max(value, param.min), param.max);
        }
    }

    /**
     * Get a parameter value
     */
    getParameter(name) {
        return this.parameters.get(name)?.value;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.parameters.clear();
        this.isInitialized = false;
    }
}
