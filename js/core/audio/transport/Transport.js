export default class Transport {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.tempo = 120;
        this.isPlaying = false;
        this.listeners = new Set();
        this.currentBeat = 0;
        this.nextBeatTime = 0;
        this.schedulerId = null;
        this.scheduleAheadTime = 0.1;    // How far ahead to schedule (sec)
        this.schedulerInterval = 25;      // How often to check schedule (ms)
    }

    setTempo(bpm) {
        this.tempo = Math.max(30, Math.min(300, bpm));
        this.notifyListeners('tempoChange', this.tempo);
    }

    getBeatDuration() {
        return 60 / this.tempo;
    }

    getCurrentBeat() {
        return this.currentBeat;
    }

    _schedule() {
        if (!this.isPlaying) return;

        const currentTime = this.audioContext.currentTime;
        console.log(`Transport scheduling at ${currentTime}, next beat at ${this.nextBeatTime}`);

        while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
            const beatEvent = {
                index: this.currentBeat % 16,
                time: this.nextBeatTime,
                tempo: this.tempo,
                beatDuration: this.getBeatDuration()
            };
            
            this.notifyListeners('beat', beatEvent);
            
            this.currentBeat++;
            this.nextBeatTime += this.getBeatDuration();
        }

        // Assicurati che lo scheduler continui
        if (this.isPlaying) {
            this.schedulerId = setTimeout(() => this._schedule(), this.schedulerInterval);
        }
    }

    start() {
        if (this.isPlaying) return;

        // Ensure audio context is running
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        console.log('Transport starting...');
        this.isPlaying = true;
        this.currentBeat = 0;
        
        const currentTime = this.audioContext.currentTime;
        this.nextBeatTime = currentTime + 0.1;

        console.log(`Transport: First beat scheduled at ${this.nextBeatTime}`);
        
        // Notifica subito il primo beat
        this.notifyListeners('start', { 
            time: this.nextBeatTime,
            beatDuration: this.getBeatDuration(),
            index: 0
        });
        
        this._schedule();
    }

    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.currentBeat = 0;
        
        if (this.schedulerId) {
            clearTimeout(this.schedulerId);
            this.schedulerId = null;
        }

        // Notifica lo stop immediatamente
        const stopTime = this.audioContext.currentTime;
        this.notifyListeners('stop', { time: stopTime });
    }

    addListener(listener) {
        if (typeof listener.onTransportEvent === 'function') {
            this.listeners.add(listener);
        }
    }

    removeListener(listener) {
        this.listeners.delete(listener);
    }

    notifyListeners(event, data) {
        console.log('Transport: Notifying listeners of', event, 'with data:', data); // Debug log
        this.listeners.forEach(listener => {
            try {
                listener.onTransportEvent(event, data);
            } catch (error) {
                console.error('Error in transport listener:', error);
            }
        });
    }
}
