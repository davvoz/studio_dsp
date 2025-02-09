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
        this.gainL = audioContext.createGain();
        this.gainR = audioContext.createGain();
        this.merger = audioContext.createChannelMerger(2);
        this.splitter = audioContext.createChannelSplitter(2);
        
        // Nodo ingresso/uscita per routing esterno
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        await this._setupAudioNode();
        this._initializeParameters();
        this.isInitialized = true;

        // Routing interno dei nodi
        this.input.connect(this.splitter);
        
        // Canale sinistro
        this.splitter.connect(this.gainL, 0);
        this.gainL.connect(this.merger, 0, 0);
        
        // Canale destro
        this.splitter.connect(this.gainR, 1);
        this.gainR.connect(this.merger, 0, 1);
        
        // Output finale
        this.merger.connect(this.output);

        // Imposta pan iniziale
        this.setPan(0);
    }

    async _setupAudioNode() {
        try {
            await StereoPanner.loadWorklet(this.audioContext);
            
            const worklet = new AudioWorkletNode(this.audioContext, 'stereo-panner-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [2],  // Stereo output
                channelCount: 2,
                channelCountMode: 'explicit',
                channelInterpretation: 'speakers'
            });

            // Usa un gain node come input buffer
            const inputBuffer = this.audioContext.createGain();
            inputBuffer.gain.value = 1.0;

            // Collega input -> worklet -> output
            inputBuffer.connect(worklet);
            worklet.connect(this.output);

            this.nodes.set('worklet', worklet);
            this.nodes.set('input', inputBuffer);

            // Imposta il pan iniziale
            this.setPan(0);

        } catch (error) {
            console.error('Error setting up stereo panner:', error);
            throw error;
        }
    }

    setPan(value) {
        const worklet = this.nodes.get('worklet');
        if (worklet && worklet.parameters.get('pan')) {
            worklet.parameters.get('pan').setValueAtTime(value, this.audioContext.currentTime);
        }
    }

    setParameter(name, value) {
        const worklet = this.nodes.get('worklet');
        if (!worklet) return;

        if (name === 'pan') {
            this.setPan(value);
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

    connect(destination) {
        this.output.connect(destination);
    }

    disconnect() {
        this.output.disconnect();
    }

    dispose() {
        [this.input, this.gainL, this.gainR, this.merger, this.splitter, this.output].forEach(node => {
            node.disconnect();
        });
        this.nodes.forEach(node => node.disconnect());
        this.nodes.clear();
        super.dispose();
    }
}

StereoPanner.workletLoaded = false;
