class GainProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{
            name: 'gain',
            defaultValue: 1.0,
            minValue: 0.0,
            maxValue: 1.0,
            automationRate: 'a-rate'
        }];
    }

    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        const gain = parameters.gain;

        // Se non c'è input, return true per mantenere attivo il processor
        if (!input || !input.length) {
            return true;
        }

        for (let channel = 0; channel < output.length; ++channel) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            if (gain.length === 1) {
                // Gain costante per tutto il buffer
                const gainValue = gain[0];
                for (let i = 0; i < outputChannel.length; ++i) {
                    outputChannel[i] = inputChannel[i] * gainValue;
                }
            } else {
                // Gain varia nel buffer (automazione)
                for (let i = 0; i < outputChannel.length; ++i) {
                    outputChannel[i] = inputChannel[i] * gain[i];
                }
            }
        }

        return true;
    }
}

registerProcessor('gain-processor', GainProcessor);
