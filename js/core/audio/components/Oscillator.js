import AbstractDSPProducer from '../processes/AbstractDSPProducer.js';

const WORKLET_URL = 'js/core/audio/worklet/OscillatorProcessor.js'; // rimosso lo slash iniziale

export default class Oscillator extends AbstractDSPProducer {
    static WAVEFORMS = {
        SINE: 0,
        SQUARE: 1,
        SAWTOOTH: 2,
        TRIANGLE: 3
    };

    static async loadWorklet(audioContext) {
        if (!Oscillator.workletLoaded) {
            await audioContext.audioWorklet.addModule(WORKLET_URL);
            Oscillator.workletLoaded = true;
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
            await Oscillator.loadWorklet(this.audioContext);
            
            const worklet = new AudioWorkletNode(this.audioContext, 'oscillator-processor', {
                outputChannelCount: [1], // Mono output per più pulizia
                numberOfInputs: 0,
                numberOfOutputs: 1
            });
            
            const nodes = {
                worklet,
                gain: this.audioContext.createGain(),
                pan: this.audioContext.createStereoPanner()
            };

            // Gain molto basso per evitare distorsione
            nodes.gain.gain.value = 0.2;
            
            Object.entries(nodes).forEach(([key, node]) => {
                this.nodes.set(key, node);
            });

            this._setupRouting();
            
            // Verifica connessioni
            console.log('Audio routing:', {
                workletParams: [...worklet.parameters.keys()],
                gainValue: nodes.gain.gain.value,
                context: this.audioContext.state
            });

            // Se il context è suspended, avvialo
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

        } catch (error) {
            console.error('Error setting up oscillator:', error);
            throw error;
        }
    }

    _setupRouting() {
        const worklet = this.nodes.get('worklet');
        const gain = this.nodes.get('gain');
        const pan = this.nodes.get('pan');

        worklet.connect(gain);
        gain.connect(pan);
        pan.connect(this.audioContext.destination);
    }

    setParameter(name, value) {
        const worklet = this.nodes.get('worklet');
        if (!worklet) return;

        switch (name) {
            case 'frequency':
                worklet.parameters.get('frequency').setValueAtTime(value, this.audioContext.currentTime);
                break;
            case 'waveform':
                worklet.parameters.get('waveform').setValueAtTime(value, this.audioContext.currentTime);
                break;
            case 'mix':
                this.nodes.get('gain').gain.setValueAtTime(value, this.audioContext.currentTime);
                break;
            case 'pan':
                this.nodes.get('pan').pan.setValueAtTime(value, this.audioContext.currentTime);
                break;
        }
    }

    _initializeParameters() {
        const parameters = [
            ['frequency', 440, 20, 20000],
            ['detune', 0, -1200, 1200],
            ['waveform', Oscillator.WAVEFORMS.SINE],
            ['pan', 0, -1, 1],
            ['mix', 1, 0, 1]
        ];

        parameters.forEach(([name, defaultValue, min, max]) => {
            this.addParameter(name, defaultValue, min, max);
        });
    }

    async _startSource(time) {
        console.log('Starting oscillator at time:', time);
        const worklet = this.nodes.get('worklet');
        const gain = this.nodes.get('gain');
        
        // Ensure context is running
        if (this.audioContext.state === 'suspended') {
            console.log('Resuming audio context before start');
            try {
                await this.audioContext.resume();
                console.log('AudioContext state after resume:', this.audioContext.state);
            } catch (err) {
                console.error('Failed to resume context:', err);
                return;
            }
        }

        if (!worklet || !gain) {
            console.error('Required nodes not found');
            return;
        }

        // Set initial parameters
        const freq = this.parameters.get('frequency')?.value ?? 440;
        const wave = this.parameters.get('waveform')?.value ?? 0;
        
        console.log('Setting oscillator parameters:', { freq, wave });
        worklet.parameters.get('frequency').setValueAtTime(freq, this.audioContext.currentTime);
        worklet.parameters.get('waveform').setValueAtTime(wave, this.audioContext.currentTime);

        // Unmute with fade-in
        gain.gain.cancelScheduledValues(time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.1);
    }

    _stopSource(time) {
        console.log('Stopping oscillator at time:', time);
        const gain = this.nodes.get('gain');
        if (!gain) return;

        gain.gain.cancelScheduledValues(time);
        gain.gain.setValueAtTime(gain.gain.value, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.01);
    }

    dispose() {
        this.nodes.forEach(node => node.disconnect());
        this.nodes.clear();
        super.dispose();
    }
}

Oscillator.workletLoaded = false;
