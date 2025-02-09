import AbstractDSPProcessor from '../processes/AbstractDSPProcessor.js';

export default class PianoRoll extends AbstractDSPProcessor {
    constructor(audioContext, id) {
        super(audioContext, id);
        this.notes = [];
        this.targets = new Set();
        this.transport = null;
        this.gridResolution = 16; // 16th notes
        this.totalBars = 1;
    }

    setTransport(transport) {
        if (!transport) {
            console.error('No transport provided to piano roll');
            return;
        }

        if (this.transportListener) {
            this.transport?.removeListener(this.transportListener);
        }

        this.transport = transport;
        
        this.transportListener = {
            onTransportEvent: (event, data) => {
                if (event === 'beat') {
                    this.processNotes(data.time, data.beatDuration);
                } else if (event === 'stop') {
                    this.stopAllNotes(data?.time || this.audioContext.currentTime);
                }
            }
        };

        this.transport.addListener(this.transportListener);
    }

    addNote(note) {
        this.notes.push(note);
        this.notes.sort((a, b) => a.startTime - b.startTime);
    }

    removeNote(noteId) {
        this.notes = this.notes.filter(note => note.id !== noteId);
    }

    processNotes(time, beatDuration) {
        const currentBeat = Math.floor(this.transport.getCurrentBeat());
        const beatPosition = currentBeat % this.gridResolution;
        
        // Stop tutte le note attive che dovrebbero essere finite
        this.notes.forEach(note => {
            const noteEndBeat = Math.floor((note.startTime + note.duration) * this.gridResolution);
            if (noteEndBeat === beatPosition) {
                this.targets.forEach(target => {
                    target.trigger(time, { stopAll: true });
                });
            }
        });

        // Avvia le nuove note
        this.notes.forEach(note => {
            const noteBeatPosition = Math.floor(note.startTime * this.gridResolution);
            
            if (noteBeatPosition === beatPosition) {
                const noteDurationInBeats = note.duration;
                const durationInSeconds = noteDurationInBeats * beatDuration;

                console.log('Playing note:', {
                    beat: currentBeat,
                    start: time,
                    duration: durationInSeconds,
                    pitch: note.pitch
                });

                this.targets.forEach(target => {
                    target.trigger(time, {
                        note: note.pitch,
                        velocity: note.velocity,
                        duration: durationInSeconds,
                        startTime: time
                    });
                });
            }
        });
    }

    isNoteInCurrentBeat(note, currentBeat) {
        return Math.floor(note.startTime) === Math.floor(currentBeat);
    }

    stopAllNotes(time) {
        this.targets.forEach(target => {
            target.trigger(time, { stopAll: true });
        });
    }

    addTarget(target) {
        if (typeof target.trigger === 'function') {
            this.targets.add(target);
        }
    }

    removeTarget(target) {
        this.targets.delete(target);
    }

    dispose() {
        if (this.transport) {
            this.transport.removeListener(this.transportListener);
        }
        this.targets.clear();
        super.dispose();
    }
}
