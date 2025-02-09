class StereoPannerProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{
            name: 'pan',
            defaultValue: 0,
            minValue: -1,
            maxValue: 1,
            automationRate: 'a-rate'
        }];
    }

    constructor() {
        super();
        this.lastPan = 0;
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const pan = parameters.pan[0];
        
        // Calcola i guadagni usando la legge del pan a potenza costante
        const leftGain = Math.cos((pan + 1) * Math.PI / 4);
        const rightGain = Math.sin((pan + 1) * Math.PI / 4);

        // Segnale di input (mono)
        const inputChannel = inputs[0][0];

        // Se non c'è input, genera silenzio su entrambi i canali
        if (!inputChannel) {
            output[0].fill(0);
            output[1].fill(0);
            return true;
        }

        // Applica il pan al segnale
        for (let i = 0; i < inputChannel.length; i++) {
            output[0][i] = inputChannel[i] * leftGain;   // Canale sinistro
            output[1][i] = inputChannel[i] * rightGain;  // Canale destro
        }

        return true;
    }
}

registerProcessor('stereo-panner-processor', StereoPannerProcessor);
