import AbstractDSPProducer from '../processes/AbstractDSPProducer.js';

const WORKLET_URL = 'js/core/audio/worklet/GainProcessor.js';

export default class Gain extends AbstractDSPProducer {
    static async loadWorklet(audioContext) {
        if (!Gain.workletLoaded) {
            await audioContext.audioWorklet.addModule(WORKLET_URL);
            Gain.workletLoaded = true;
        }
    }

    constructor(audioContext, id) {
        super(audioContext, id);
        this.id = id;
        this.audioContext = audioContext;
        this.nodes = new Map();
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        await this._setupAudioNode();
        this._initializeParameters();
        this.isInitialized = true;
    }

    async _setupAudioNode() {
        try {
            await Gain.loadWorklet(this.audioContext);
            
            const worklet = new AudioWorkletNode(this.audioContext, 'gain-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 2
            });
            
            this.nodes.set('worklet', worklet);
            worklet.connect(this.audioContext.destination);

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

        } catch (error) {
            console.error('Error setting up gain:', error);
            throw error;
        }
    }

    setParameter(name, value) {
        const worklet = this.nodes.get('worklet');
        if (!worklet) return;

        if (name === 'gain') {
            worklet.parameters.get('gain').setValueAtTime(value, this.audioContext.currentTime);
        }
    }

    _initializeParameters() {
        this.addParameter('gain', 1.0, 0.0, 1.0);
    }

    async _startSource(time) {
        const worklet = this.nodes.get('worklet');
        if (!worklet) return;

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const gainValue = this.parameters.get('gain')?.value ?? 1.0;
        worklet.parameters.get('gain').setValueAtTime(gainValue, time);
    }

    _stopSource(time) {
        const worklet = this.nodes.get('worklet');
        if (!worklet) return;

        worklet.parameters.get('gain').linearRampToValueAtTime(0, time + 0.01);
    }

    dispose() {
        this.nodes.forEach(node => node.disconnect());
        this.nodes.clear();
        super.dispose();
    }
}

Gain.workletLoaded = false;
