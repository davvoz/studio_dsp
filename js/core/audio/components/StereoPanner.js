import AbstractDSPProducer from '../processes/AbstractDSPProducer.js';

const WORKLET_URL = 'js/core/audio/worklet/StereoPannerProcessor.js';

export default class StereoPanner extends AbstractDSPProducer {
    static async loadWorklet(audioContext) {
        if (!StereoPanner.workletLoaded) {
            await audioContext.audioWorklet.addModule(WORKLET_URL);
            StereoPanner.workletLoaded = true;
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
            await StereoPanner.loadWorklet(this.audioContext);
            
            const worklet = new AudioWorkletNode(this.audioContext, 'stereo-panner-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [2],  // Forza output stereo
                channelCount: 2,
                channelCountMode: 'explicit',
                channelInterpretation: 'speakers'
            });
            
            this.nodes.set('worklet', worklet);
            worklet.connect(this.audioContext.destination);

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

        } catch (error) {
            console.error('Error setting up stereo panner:', error);
            throw error;
        }
    }

    setParameter(name, value) {
        const worklet = this.nodes.get('worklet');
        if (!worklet) return;

        if (name === 'pan') {
            worklet.parameters.get('pan').setValueAtTime(value, this.audioContext.currentTime);
        }
    }

    _initializeParameters() {
        this.addParameter('pan', 0, -1, 1);
    }

    async _startSource(time) {
        const worklet = this.nodes.get('worklet');
        if (!worklet) return;

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const panValue = this.parameters.get('pan')?.value ?? 0;
        worklet.parameters.get('pan').setValueAtTime(panValue, time);
    }

    _stopSource(time) {
        // Non è necessario fare nulla di specifico per lo stop del panner
    }

    dispose() {
        this.nodes.forEach(node => node.disconnect());
        this.nodes.clear();
        super.dispose();
    }
}

StereoPanner.workletLoaded = false;
