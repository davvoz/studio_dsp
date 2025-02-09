import Panel from '../components/Panel.js';
import PianoRoll from '../../core/audio/components/PianoRoll.js';

export default class PianoRollPanel extends Panel {
    constructor(audioEngine) {
        super('piano-roll-panel', {
            title: 'Piano Roll',
            width: '800px',
            height: '400px',
            draggable: true,
            collapsible: true
        });

        this.audioEngine = audioEngine;
        this.pianoRoll = new PianoRoll(audioEngine.audioContext, 'main-piano-roll');
        this.pianoRoll.setTransport(audioEngine.getTransport());
        
        this.noteHeight = 20;
        this.noteWidth = 50;
        this.octaves = 4;
        this.startOctave = 3;
        this.gridColumns = 16;
        this.notes = [];
        this.isDragging = false;
        this.currentNote = null;
    }

    create() {
        super.create();
        
        const content = this.element.querySelector('.panel-content');
        
        // Create flex container
        const pianoRollContainer = document.createElement('div');
        pianoRollContainer.className = 'piano-roll-container';
        pianoRollContainer.style.display = 'flex';
        
        // Piano keys column
        this.createPianoKeys(pianoRollContainer);
        
        // Grid area
        this.createNoteGrid(pianoRollContainer);
        
        content.appendChild(pianoRollContainer);
        this.setupEventListeners();
    }

    createPianoKeys(container) {
        const pianoKeys = document.createElement('div');
        pianoKeys.className = 'piano-keys';
        
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        for (let octave = this.startOctave + this.octaves - 1; octave >= this.startOctave; octave--) {
            notes.forEach(note => {
                const key = document.createElement('div');
                key.className = `piano-key ${note.includes('#') ? 'black' : 'white'}`;
                key.dataset.note = `${note}${octave}`;
                key.textContent = `${note}${octave}`;
                pianoKeys.appendChild(key);
            });
        }
        
        container.appendChild(pianoKeys);
    }

    createNoteGrid(container) {
        const gridContainer = document.createElement('div');
        gridContainer.className = 'note-grid-container';
        
        const grid = document.createElement('div');
        grid.className = 'note-grid';
        
        // Create grid lines
        for (let i = 0; i < this.gridColumns; i++) {
            const gridLine = document.createElement('div');
            gridLine.className = 'grid-line';
            grid.appendChild(gridLine);
        }

        // Add playhead
        this.playhead = document.createElement('div');
        this.playhead.className = 'playhead';
        grid.appendChild(this.playhead);
        
        gridContainer.appendChild(grid);
        container.appendChild(gridContainer);
        
        this.grid = grid;

        // Add transport listener for playhead
        this.audioEngine.getTransport().addListener({
            onTransportEvent: (event, data) => {
                if (event === 'beat') {
                    this.updatePlayhead(data.index);
                } else if (event === 'stop') {
                    this.resetPlayhead();
                }
            }
        });
    }

    updatePlayhead(beatIndex) {
        const position = (beatIndex % this.gridColumns) * this.noteWidth;
        this.playhead.style.left = `${position}px`;
        
        // Auto-scroll if playhead is not visible
        const gridContainer = this.grid.parentElement;
        if (position > gridContainer.scrollLeft + gridContainer.clientWidth || 
            position < gridContainer.scrollLeft) {
            gridContainer.scrollLeft = position - (gridContainer.clientWidth / 2);
        }
    }

    resetPlayhead() {
        this.playhead.style.left = '0px';
        this.grid.parentElement.scrollLeft = 0;
    }

    setupEventListeners() {
        this.grid.addEventListener('mousedown', (e) => this.handleGridMouseDown(e));
        this.grid.addEventListener('mousemove', (e) => this.handleGridMouseMove(e));
        this.grid.addEventListener('mouseup', () => this.handleGridMouseUp());
    }

    handleGridMouseDown(e) {
        this.isDragging = true;
        this.addNote(e);
    }

    handleGridMouseMove(e) {
        if (this.isDragging && this.currentNote) {
            const width = Math.max(this.noteWidth, e.offsetX - this.currentNote.offsetLeft);
            this.currentNote.style.width = `${width}px`;
            
            // Aggiorna la durata della nota
            const noteId = this.currentNote.dataset.noteId;
            const duration = width / this.noteWidth / this.gridColumns;
            this.updateNoteDuration(noteId, duration);
        }
    }

    handleGridMouseUp() {
        this.isDragging = false;
        this.currentNote = null;
    }

    addNote(e) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        
        const gridRect = this.grid.getBoundingClientRect();
        const x = e.clientX - gridRect.left;
        const y = e.clientY - gridRect.top;
        
        const noteId = Date.now();
        noteElement.dataset.noteId = noteId;
        
        const gridX = Math.floor(x / this.noteWidth) * this.noteWidth;
        const gridY = Math.floor(y / this.noteHeight) * this.noteHeight;
        
        noteElement.style.left = `${gridX}px`;
        noteElement.style.top = `${gridY}px`;
        noteElement.style.width = `${this.noteWidth}px`;
        noteElement.style.height = `${this.noteHeight}px`;
        
        this.grid.appendChild(noteElement);
        this.currentNote = noteElement;
        
        // Add note to piano roll
        const startTime = gridX / this.noteWidth / this.gridColumns;
        const pitch = this.gridYToNote(gridY);
        
        // Modifica la creazione della nota
        const note = {
            id: noteId,
            pitch,
            startTime: gridX / (this.noteWidth * this.gridColumns),
            duration: 1, // Durata iniziale di un beat
            velocity: 1
        };
        
        console.log('Adding note:', note);
        this.pianoRoll.addNote(note);

        // Mostra info nota
        this.updateNoteInfo(noteElement, pitch);
    }

    updateNoteDuration(noteId, duration) {
        const note = this.pianoRoll.notes.find(n => n.id.toString() === noteId);
        if (note) {
            note.duration = duration;
        }
    }

    updateNoteInfo(noteElement, pitch) {
        const freq = this.midiNoteToFrequency(pitch);
        noteElement.title = `Note: ${pitch} (${freq.toFixed(1)}Hz)`;
        
        // Aggiungi etichetta frequenza
        const label = document.createElement('span');
        label.className = 'note-label';
        label.textContent = `${freq.toFixed(0)}Hz`;
        noteElement.appendChild(label);
    }

    gridYToNote(y) {
        const noteIndex = Math.floor(y / this.noteHeight);
        const octave = this.startOctave + Math.floor((11 - noteIndex) / 12);
        const note = 11 - (noteIndex % 12);
        return note + (octave * 12);
    }

    connectToOscillator(oscillatorPanel) {
        if (!oscillatorPanel) {
            console.error('No oscillator panel provided');
            return;
        }

        console.log('Connecting piano roll to oscillator:', oscillatorPanel.id);
        
        const target = {
            trigger: (time, noteInfo) => {
                const osc = oscillatorPanel.getOscillator();
                if (!osc) return;

                try {
                    if (noteInfo.stopAll) {
                        osc.stop(time);
                        return;
                    }

                    const freq = this.midiNoteToFrequency(noteInfo.note);
                    
                    // Usa il nuovo metodo specifico per le note
                    osc.setNoteFrequency(freq, time);
                    
                    osc.start(time);
                    if (noteInfo.duration) {
                        osc.stop(time + noteInfo.duration);
                    }

                    this.triggerVisualFeedback(oscillatorPanel);
                } catch (error) {
                    console.error('Error triggering oscillator:', error);
                }
            }
        };

        this.pianoRoll.addTarget(target);
        oscillatorPanel.setConnected(true);
        
        // Aggiungi indicatore di connessione
        const connectionIndicator = document.createElement('div');
        connectionIndicator.className = 'connection-indicator';
        connectionIndicator.textContent = '⚡ Connected to Oscillator';
        this.element.querySelector('.panel-content').appendChild(connectionIndicator);
    }

    midiNoteToFrequency(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    triggerVisualFeedback(oscillatorPanel) {
        const panel = oscillatorPanel.element;
        panel.classList.add('triggered');
        setTimeout(() => panel.classList.remove('triggered'), 100);
    }

    dispose() {
        this.pianoRoll.dispose();
        super.dispose();
    }
}
