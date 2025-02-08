import AbstractDSPComponent from './AbstractDSPComponent.js';

class AbstractDSPFx extends AbstractDSPComponent {
    constructor(audioContext, id) {
        super(audioContext, id);
        this.wet = this.audioContext.createGain();
        this.dry = this.audioContext.createGain();
        this.bypass = false;
    }

    setBypass(bypassed) {
        this.bypass = bypassed;
        this.wet.gain.setValueAtTime(bypassed ? 0 : 1, this.audioContext.currentTime);
        this.dry.gain.setValueAtTime(bypassed ? 1 : 0, this.audioContext.currentTime);
    }

    _setupAudioNode() {
        super._setupAudioNode();
        this.wet.connect(this.outputs);
        this.dry.connect(this.outputs);
    }

    dispose() {
        super.dispose();
        this.wet.disconnect();
        this.dry.disconnect();
    }
}

export default AbstractDSPFx;
