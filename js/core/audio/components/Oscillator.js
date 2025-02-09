import AbstractDSPProducer from '../processes/AbstractDSPProducer.js';
import StereoPanner from './StereoPanner.js';  // Aggiungi import

const WORKLET_URL = 'js/core/audio/worklet/OscillatorProcessor.js'; // rimosso lo slash iniziale

export default class Oscillator extends AbstractDSPProducer {
    static WAVEFORMS = {
        SINE: 0,
        SQUARE: 1,
        SAWTOOTH: 2,
        TRIANGLE: 3,
        WHITE_NOISE: 4
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
        this.baseFrequency = 440; // Frequenza base (quella del piano roll)
        this.frequencyMod = 0;    // Modificatore di frequenza
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        await this._setupAudioNode();
        this._initializeParameters();
        
        // Importante: inizializziamo l'oscillatore come muto
        const gain = this.nodes.get('gain');
        if (gain) {
            gain.gain.value = 0;
        }
        
        this.isInitialized = true;
    }

    async _setupAudioNode() {
        try {
            await Oscillator.loadWorklet(this.audioContext);
            
            const worklet = new AudioWorkletNode(this.audioContext, 'oscillator-processor', {
                outputChannelCount: [1],  // Mono output
                numberOfInputs: 0,
                numberOfOutputs: 1
            });
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            

            
            this.nodes.set('worklet', worklet);
            this.nodes.set('gain', gainNode);

            // Routing corretto usando connect
            worklet.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            console.log('Audio routing complete:', this.id);
        } catch (error) {
            console.error('Error setting up oscillator:', error);
            throw error;
        }
    }

    setParameter(name, value, time = this.audioContext.currentTime) {
        const worklet = this.nodes.get('worklet');
        const gain = this.nodes.get('gain');

        if (!worklet || !gain) {
            console.error('Required nodes not found for parameter:', name);
            return;
        }

        switch(name) {
            case 'frequency':
                if (worklet.parameters.has('frequency')) {
                    // Mantieni traccia della frequenza base quando viene dal piano roll
                    if (this.isNoteFrequency) {
                        this.baseFrequency = value;
                        value += this.frequencyMod;
                    } else {
                        // Se viene dai controlli, aggiorna solo il modificatore
                        this.frequencyMod = value - this.baseFrequency;
                    }
                    worklet.parameters.get('frequency').setValueAtTime(value, time);
                    console.log('Set frequency:', {
                        base: this.baseFrequency,
                        mod: this.frequencyMod,
                        final: value
                    });
                }
                break;
            case 'waveform':
                if (worklet.parameters.has('waveform')) {
                    worklet.parameters.get('waveform').setValueAtTime(value, time);
                    console.log('Set waveform:', value, 'at time:', time);
                }
                break;
            case 'mix':
                gain.gain.setValueAtTime(value, time);
                console.log('Set gain:', value, 'at time:', time);
                break;
            default:
                console.warn('Unknown parameter:', name);
        }
    }

    getCurrentBaseFrequency() {
        return this.baseFrequency;
    }

    getCurrentFrequency() {
        return this.baseFrequency + this.frequencyMod;
    }

    getCurrentMix() {
        return this.nodes.get('gain')?.gain.value || 0;
    }

    _initializeParameters() {
        const parameters = [
            ['frequency', 440, 20, 20000],
            ['detune', 0, -1200, 1200],
            ['waveform', Oscillator.WAVEFORMS.SINE],
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
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        setTimeout(() => gain.gain.setValueAtTime(0.2, this.audioContext.currentTime + time), time * 1000 + 100);
    }

    _stopSource(time) {
        console.log('Stopping oscillator at time:', time);
        const gain = this.nodes.get('gain');
        if (!gain) return;

        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    }

    dispose() {      
        this.nodes.forEach(node => {
            if (node && typeof node.disconnect === 'function') {
                node.disconnect();
            }
        });
        this.nodes.clear();
        super.dispose();
    }

    start(time = this.audioContext.currentTime) {
        const worklet = this.nodes.get('worklet');
        const gain = this.nodes.get('gain');
        
        if (!worklet || !gain) {
            console.error('Required nodes not found');
            return;
        }

        // Resetta eventuali automazioni precedenti
        gain.gain.cancelScheduledValues(time);
        
        // Attiva il suono con un breve fade-in per evitare click
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(1, time + 0.005);
        
        this.isPlaying = true;
        console.log('Oscillator started at time:', time);
    }

    stop(time = this.audioContext.currentTime) {
        const gain = this.nodes.get('gain');
        if (!gain) return;

        // Aggiungi un breve fade-out per evitare click
        gain.gain.cancelScheduledValues(time);
        gain.gain.setValueAtTime(gain.gain.value, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.005);
        
        this.isPlaying = false;
        console.log('Oscillator stopped at time:', time);
    }

    setFrequency(freq, time = this.audioContext.currentTime) {
        const worklet = this.nodes.get('worklet');
        if (worklet && worklet.parameters.has('frequency')) {
            worklet.parameters.get('frequency').setValueAtTime(freq, time);
            console.log('Set frequency to:', freq, 'at time:', time);
        }
    }

    setFrequency(value, time) {
        this.frequency = value;
        const worklet = this.nodes.get('worklet');
        if (worklet) {
            // Previeni click utilizzando una breve rampa
            const param = worklet.parameters.get('frequency');
            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            param.linearRampToValueAtTime(value, time + 0.005);
            console.log('Set frequency to', value, 'at time', time);
        }
    }

    // Metodo per il piano roll
    setNoteFrequency(freq, time = this.audioContext.currentTime) {
        this.isNoteFrequency = true;
        this.setParameter('frequency', freq, time);
        this.isNoteFrequency = false;
    }

    // Aggiungi un metodo di sicurezza per verificare lo stato
    checkNodes() {
        const worklet = this.nodes.get('worklet');
        const gain = this.nodes.get('gain');
        const panner = this.nodes.get('panner');

        return {
            hasWorklet: !!worklet,
            hasGain: !!gain,
            hasPanner: !!panner,
            isValid: !!(worklet && gain && panner)
        };
    }
}

Oscillator.workletLoaded = false;
