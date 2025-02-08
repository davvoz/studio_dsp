import AbstractDSPProducer from '../processes/AbstractDSPProducer.js';
import Gain from './Gain.js';
import StereoPanner from './StereoPanner.js';  // Aggiungi import

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
            
            const gainNode = new Gain(this.audioContext, `${this.id}_gain`);
            const pannerNode = new StereoPanner(this.audioContext, `${this.id}_panner`);
            
            await gainNode.initialize();
            await pannerNode.initialize();
            
            const nodes = {
                worklet,
                gain: gainNode,
                panner: pannerNode
            };

            // Imposta il gain iniziale basso
            gainNode.setParameter('gain', 0.2);
            
            Object.entries(nodes).forEach(([key, node]) => {
                this.nodes.set(key, node);
            });

            this._setupRouting();
            
            // Verifica connessioni
            console.log('Audio routing:', {
                workletParams: [...worklet.parameters.keys()],
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
        const panner = this.nodes.get('panner');

        if (!worklet || !gain || !panner) {
            console.error('Missing nodes for routing:', { worklet, gain, panner });
            return;
        }

        console.log('Setting up routing chain:', 'worklet -> gain -> panner -> destination');
        
        // Assicurati che ogni nodo sia disconnesso prima di riconnettere
        worklet.disconnect();
        gain.nodes.get('worklet').disconnect();
        panner.nodes.get('worklet').disconnect();

        // Ricrea la catena di connessioni
        worklet.connect(gain.nodes.get('worklet'));
        gain.nodes.get('worklet').connect(panner.nodes.get('worklet'));
        panner.nodes.get('worklet').connect(this.audioContext.destination);
    }

    setParameter(name, value) {
        const worklet = this.nodes.get('worklet');
        const gain = this.nodes.get('gain');
        const panner = this.nodes.get('panner');
        if (!worklet || !gain || !panner) return;

        switch (name) {
            case 'frequency':
                worklet.parameters.get('frequency').setValueAtTime(value, this.audioContext.currentTime);
                break;
            case 'waveform':
                worklet.parameters.get('waveform').setValueAtTime(value, this.audioContext.currentTime);
                break;
            case 'mix':
                gain.setParameter('gain', value);
                break;
            case 'pan':
                panner.setParameter('pan', value);
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

        // Unmute with fade-in usando il nostro gain
        gain.setParameter('gain', 0);
        setTimeout(() => gain.setParameter('gain', 0.2), time * 1000 + 100);
    }

    _stopSource(time) {
        console.log('Stopping oscillator at time:', time);
        const gain = this.nodes.get('gain');
        if (!gain) return;

        gain.setParameter('gain', 0);
    }

    dispose() {
        const gain = this.nodes.get('gain');
        const panner = this.nodes.get('panner');
        if (gain) gain.dispose();
        if (panner) panner.dispose();
        
        this.nodes.forEach(node => {
            if (node !== gain && node !== panner) node.disconnect();
        });
        this.nodes.clear();
        super.dispose();
    }
}

Oscillator.workletLoaded = false;
