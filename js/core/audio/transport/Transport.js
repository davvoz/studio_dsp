export default class Transport {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.tempo = 120;
        this.isPlaying = false;
        this.listeners = new Map();
        
        // Timing base
        this.currentStep = 0;
        this.nextStepTime = 0;
        
        // Struttura (16 step per battuta)
        this.stepsPerBar = 16;
        this.bars = 4;
        this.totalSteps = this.bars * this.stepsPerBar;
        
        this.scheduleAheadTime = 0.1;
        this.scheduleId = null;
    }

    _schedule() {
        const currentTime = this.audioContext.currentTime;
        const stepDuration = 60 / (this.tempo * 4); // Durata fissa di una sedicesima
        
        while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
            const beatEvent = {
                time: this.nextStepTime,
                stepIndex: this.currentStep,
                step: this.currentStep % this.stepsPerBar,
                bar: Math.floor(this.currentStep / this.stepsPerBar),
                duration: stepDuration,
                totalSteps: this.totalSteps
            };

            this.notifyListeners('beat', beatEvent);
            
            this.currentStep = (this.currentStep + 1) % this.totalSteps;
            this.nextStepTime += stepDuration; // Usa sempre la stessa durata dello step
        }

        if (this.isPlaying) {
            this.scheduleId = requestAnimationFrame(() => this._schedule());
        }
    }

    setTempo(bpm) {
        this.tempo = Math.max(30, Math.min(600, bpm));
        this.notifyListeners('tempoChange', this.tempo);
    }

    setDivision(division) {
        this.division = division;
        this.notifyListeners('divisionChange', { division });
    }

    setNumberOfBars(bars) {
        this.bars = bars;
        this.notifyListeners('barsChange', { bars });
    }

    getBeatDuration() {
        return 60 / this.tempo;
    }

    getCurrentBeat() {
        return this.currentBeat;
    }

    start() {
        if (this.isPlaying) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;
        this.currentBeat = 0;
        this.nextBeatTime = this.audioContext.currentTime + 0.1;

        this.notifyListeners('start', { 
            time: this.nextBeatTime,
            duration: this.getBeatDuration()
        });

        // Use scheduleId for cancellation
        const scheduleLoop = () => {
            this._schedule();
            if (this.isPlaying) {
                this.scheduleId = requestAnimationFrame(scheduleLoop);
            }
        };
        
        scheduleLoop();
    }

    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.currentBeat = 0;
        this.currentStep = 0;
        this.nextStepTime = 0;
        
        if (this.scheduleId) {
            cancelAnimationFrame(this.scheduleId);
            this.scheduleId = null;
        }

        const stopTime = this.audioContext.currentTime;
        this.notifyListeners('stop', { 
            time: stopTime,
            reset: true  // Indichiamo che è uno stop completo
        });
    }

    addListener(listener) {
        if (typeof listener.onTransportEvent === 'function') {
            this.listeners.set(listener, listener.onTransportEvent);
        }
    }

    removeListener(listener) {
        this.listeners.delete(listener);
    }

    notifyListeners(event, data) {
        console.log('Transport: Notifying listeners of', event, 'with data:', data);
        this.listeners.forEach((callback, listener) => {
            try {
                callback.call(listener, event, data);
            } catch (error) {
                console.error('Error in transport listener:', error);
            }
        });
    }
}
