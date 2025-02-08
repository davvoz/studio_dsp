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
                maxValue: 3,
                automationRate: 'k-rate'
            }
        ];
    }

    constructor() {
        super();
        this.phase = 0;
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const frequency = parameters.frequency[0];
        
        // Incremento di fase semplificato
        const phaseStep = (frequency / sampleRate) * (2 * Math.PI);

        // Prendiamo il valore del waveform una sola volta per buffer
        const waveform = Math.floor(parameters.waveform[0]);

        for (let channel = 0; channel < output.length; ++channel) {
            const outputChannel = output[channel];
            
            for (let i = 0; i < outputChannel.length; ++i) {
                // Generazione base delle forme d'onda
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
                }

                // Avanzamento fase più preciso
                this.phase += phaseStep;
            }
        }

        return true;
    }
}

registerProcessor('oscillator-processor', OscillatorProcessor);
