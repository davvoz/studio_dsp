import AbstractDSPComponent from './AbstractDSPComponent.js';

class AbstractDSPProducer extends AbstractDSPComponent {
    constructor(audioContext, id) {
        super(audioContext, id);
        this.isPlaying = false;
    }

    start(time = this.audioContext.currentTime) {
        if (this.isInitialized && !this.isPlaying) {
            this._startSource(time);
            this.isPlaying = true;
        }
    }

    stop(time = this.audioContext.currentTime) {
        if (this.isInitialized && this.isPlaying) {
            this._stopSource(time);
            this.isPlaying = false;
        }
    }

    _startSource(time) {
        throw new Error('_startSource must be implemented by subclass');
    }

    _stopSource(time) {
        throw new Error('_stopSource must be implemented by subclass');
    }
}

export default AbstractDSPProducer;
