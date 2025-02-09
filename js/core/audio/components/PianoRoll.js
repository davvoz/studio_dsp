import AbstractDSPProcessor from '../processes/AbstractDSPProcessor.js';

export default class PianoRoll extends AbstractDSPProcessor {
    constructor(audioContext, id) {
        super(audioContext, id);
        this._notes = []; // Rinominato a _notes per evitare conflitti
        this.targets = new Set();
        this.transport = null;
        this.gridResolution = 16; // 16th notes
        this.totalBars = 1;
        
        // Add debug method call
        setInterval(() => this.debugNoteCount(), 1000);
    }

    debugNoteCount() {
        if (this._notes.length > 0) {
            console.table(this._notes.map(n => ({
                id: n.id,
                pitch: n.pitch,
                startTime: n.startTime,
                addedAt: new Date(n.id).toLocaleTimeString()
            })));
        }
    }

    get notes() {
        return this._notes;
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
        note.id = Number(note.id);
        
        // Check for duplicate notes
        const existingNote = this._notes.find(n => n.id === note.id);
        if (existingNote) {
            console.warn('Duplicate note detected:', {
                existing: existingNote,
                attempted: note
            });
            return false;
        }

        // Add timestamp for debugging
        note.addedAt = Date.now();
        
        this._notes.push({...note});
        console.log('Note array state:', {
            added: note.id,
            total: this._notes.length,
            allIds: this._notes.map(n => n.id)
        });
        return true;
    }

    removeNote(noteId) {
        noteId = Number(noteId);
        console.log('Before removal:', {
            totalNotes: this._notes.length,
            allNoteIds: this._notes.map(n => n.id),
            toRemove: noteId
        });

        // Find the exact note we want to remove
        const noteToRemove = this._notes.find(n => n.id === noteId);
        if (!noteToRemove) {
            console.warn(`Note ${noteId} not found in array`);
            return false;
        }

        // Create new array without the note
        this._notes = this._notes.filter(note => note.id !== noteId);

        console.log('After removal:', {
            totalNotes: this._notes.length,
            allNoteIds: this._notes.map(n => n.id),
            removed: noteId,
            successful: true
        });

        return true;
    }

    processNotes(time, beatDuration) {
        const currentBeat = Math.floor(this.transport.getCurrentBeat());
        const beatPosition = currentBeat % this.gridResolution;
        
        for (const note of this._notes) {
            const noteEndBeat = Math.floor((note.startTime + note.duration) * this.gridResolution);
            if (noteEndBeat === beatPosition) {
                this.targets.forEach(target => {
                    target.trigger(time, { stopAll: true });
                });
            }
        }

        for (const note of this._notes) {
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
        }
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
