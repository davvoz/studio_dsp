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
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        await this._setupAudioNode();
        this._initializeParameters();
        
        // Assicurati che l'oscillatore parta muto
        const gain = this.nodes.get('gain');
        if (gain) {
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
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

    setParameter(name, value) {
        const worklet = this.nodes.get('worklet');
        const gainNode = this.nodes.get('gain');
        
        if (!worklet || !gainNode ) return;

        try {
            switch (name) {
                case 'frequency':
                    this.frequency = value;
                    worklet.parameters.get('frequency').setValueAtTime(value, this.audioContext.currentTime);
                    break;
                case 'waveform':
                    worklet.parameters.get('waveform').setValueAtTime(value, this.audioContext.currentTime);
                    break;
                case 'mix':
                    gainNode.gain.setValueAtTime(value, this.audioContext.currentTime);
                    break;
                 case 'pwm':
                    worklet.parameters.get('pwm').setValueAtTime(value, this.audioContext.currentTime);
                    break;
            }
        } catch (error) {
            console.error(`Error setting parameter ${name}:`, error);
        }
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

    start(time = 0) {
        const worklet = this.nodes.get('worklet');
        const gainNode = this.nodes.get('gain');
        
        if (!worklet || !gainNode) {
            console.warn('Missing nodes in oscillator start');
            return;
        }

        time = Math.max(time, this.audioContext.currentTime);

        try {
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.2, time + 0.002);

            if (this.frequency) {
                worklet.parameters.get('frequency').setValueAtTime(this.frequency, time);
            }
            
            this.isPlaying = true;
            console.log(`Oscillator ${this.id} started at ${time}`);
        } catch (error) {
            console.error('Error starting oscillator:', error);
        }
    }

    stop(time = 0) {
        const gainNode = this.nodes.get('gain');
        if (!gainNode) {
            console.warn('Missing gain node in oscillator stop');
            return;
        }

        time = Math.max(time, this.audioContext.currentTime);
        
        try {
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(gainNode.gain.value, time);
            gainNode.gain.linearRampToValueAtTime(0, time + 0.002);
            
            this.isPlaying = false;
            console.log(`Oscillator ${this.id} stopped at ${time}`);
        } catch (error) {
            console.error('Error stopping oscillator:', error);
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
