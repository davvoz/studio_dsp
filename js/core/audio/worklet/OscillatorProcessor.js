class OscillatorProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            {
                name: 'frequency',
                defaultValue: 440,
                minValue: 20,
                maxValue: 20000,
                automationRate: 'a-rate'
            },
            {
                name: 'waveform',
                defaultValue: 0,
                minValue: 0,
                maxValue: 4,  // Modificato per includere solo fino al noise
                automationRate: 'k-rate'
            }
        ];
    }

    constructor() {
        super();
        this.phase = 0;
        this.noiseBuffer = new Float32Array(2);  // Per il noise
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const frequency = parameters.frequency[0];
        const phaseStep = (frequency / sampleRate) * (2 * Math.PI);
        const waveform = Math.floor(parameters.waveform[0]);

        for (let channel = 0; channel < output.length; ++channel) {
            const outputChannel = output[channel];
            
            for (let i = 0; i < outputChannel.length; ++i) {
                switch (waveform) {
                    case 0: // Sine
                        outputChannel[i] = Math.sin(this.phase);
                        break;
                    
                    case 1: // Square base
                        outputChannel[i] = Math.sin(this.phase) >= 0 ? 0.5 : -0.5;
                        break;
                    
                    case 2: // Sawtooth base
                        outputChannel[i] = -0.5 + (this.phase % (2 * Math.PI)) / (2 * Math.PI);
                        break;
                    
                    case 3: // Triangle base
                        const saw = -1 + (this.phase % (2 * Math.PI)) / Math.PI;
                        outputChannel[i] = 0.5 * (Math.abs(saw) * 2 - 1);
                        break;
                    
                    case 4: // White Noise
                        outputChannel[i] = Math.random() * 2 - 1;
                        break;
                }

                this.phase += phaseStep;
                if (this.phase >= 2 * Math.PI) {
                    this.phase -= 2 * Math.PI;
                }
            }
        }

        return true;
    }
}

registerProcessor('oscillator-processor', OscillatorProcessor);
