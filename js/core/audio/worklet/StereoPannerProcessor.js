class StereoPannerProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{
            name: 'pan',
            defaultValue: 0.0,
            minValue: -1.0,
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
        const pan = parameters.pan;

        if (!input || !input.length) return true;

        // Assicuriamoci di avere due canali di output
        if (output.length < 2) return true;

        const isInputMono = input.length === 1;
        const inputChannel = isInputMono ? input[0] : input;

        for (let i = 0; i < output[0].length; ++i) {
            const panValue = pan.length === 1 ? pan[0] : pan[i];
            
            // Curva di panning più pronunciata
            const normPan = Math.PI * (panValue + 1) / 4;  // Normalizza tra 0 e π/2
            const leftGain = Math.cos(normPan) * Math.cos(normPan);  // Quadratica per enfatizzare
            const rightGain = Math.sin(normPan) * Math.sin(normPan); // Quadratica per enfatizzare

            // Se l'input è mono, lo distribuiamo su entrambi i canali
            if (isInputMono) {
                const inputSample = inputChannel[i];
                output[0][i] = inputSample * leftGain;
                output[1][i] = inputSample * rightGain;
            } else {
                // Se l'input è stereo, applichiamo il panning mantenendo la separazione
                output[0][i] = (input[0][i] || 0) * leftGain;
                output[1][i] = (input[1][i] || 0) * rightGain;
            }
        }

        return true;
    }
}

registerProcessor('stereo-panner-processor', StereoPannerProcessor);
