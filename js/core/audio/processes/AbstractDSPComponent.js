import AbstractAudioComponent from '../AbstractAudioComponent.js';

class AbstractDSPComponent extends AbstractAudioComponent {
    constructor(audioContext, id) {
        super(audioContext);
        this.id = id;
        this.parameters = new Map();
        this.nodes = new Map();
        this.connections = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        await this._setupAudioNode();
        this._initializeParameters();
        this.isInitialized = true;
    }

    addParameter(name, defaultValue, min = -Infinity, max = Infinity) {
        this.parameters.set(name, {
            value: defaultValue,
            min: min,
            max: max,
            audioParam: null
        });
    }

    setParameter(name, value) {
        const param = this.parameters.get(name);
        if (param) {
            param.value = Math.max(param.min, Math.min(param.max, value));
            if (param.audioParam) {
                param.audioParam.setValueAtTime(param.value, this.audioContext.currentTime);
            }
        }
    }

    getParameter(name) {
        return this.parameters.get(name)?.value;
    }
}

export default AbstractDSPComponent;
