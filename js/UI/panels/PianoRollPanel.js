import Panel from '../components/Panel.js';
import PianoRoll from '../../core/audio/components/PianoRoll.js';

export default class PianoRollPanel extends Panel {
    constructor(audioEngine) {
        super('piano-roll-panel', {
            title: 'Piano Roll',
            width: '900px',
            height: 'auto',
            draggable: true,
            collapsible: true
        });

        this.audioEngine = audioEngine;
        this.transport = audioEngine.getTransport();

        // Grid settings (16 steps per bar)
        this.config = {
            noteHeight: 20,
            stepWidth: 30,     // Larghezza di uno step
            stepsPerBar: 16,   // 16 step per battuta
            bars: 1,
            octaves: 7,        // Aumentato da 4 a 7 ottave
            startOctave: 1     // Cambiato da 3 a 0
        };

        // Setup transport configuration
        this.transport.bars = this.config.bars;
        this.transport.totalSteps = this.config.bars * this.config.stepsPerBar;

        // Create PianoRoll instance
        this.pianoRoll = new PianoRoll(audioEngine.audioContext, 'piano-roll-' + Date.now());
        this.pianoRoll.setTransport(this.transport);

        // Calculate total dimensions
        this.config.totalHeight = this.config.noteHeight * this.config.octaves * 12;
        this.config.totalWidth = this.config.stepWidth * this.config.stepsPerBar * this.config.bars;

        // Note management
        this.noteElements = new Map(); // For DOM elements
        this.currentNote = null;
        this.isDragging = false;

        this.setupTransportListener();

        this.mode = 'compose';
        this.currentBar = 0;
    }

    create() {
        super.create();
        
        // Get panel content element
        const content = this.element.querySelector('.panel-content');
        content.style.cssText = ''; // Reset any inline styles

        // Create visual divider after title
        const divider = document.createElement('div');
        divider.className = 'panel-divider';
        content.appendChild(divider);

        // Create and append controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        content.appendChild(controlsContainer);

        // Create controls
        const controls = this.createControls();
        controlsContainer.appendChild(controls);

        // Create and append piano-roll interface container
        const pianoRollInterface = document.createElement('div');
        pianoRollInterface.className = 'piano-roll-interface';
        content.appendChild(pianoRollInterface);

        // Add piano roll components
        const pianoRollContainer = document.createElement('div');
        pianoRollContainer.className = 'piano-roll-container';
        pianoRollInterface.appendChild(pianoRollContainer);
        
        // Add piano keys and grid
        this.createPianoKeys(pianoRollContainer);
        this.createNoteGrid(pianoRollContainer);
        
        this.setupEventListeners();
    }

    calculateGridDimensions() {
        return {
            stepWidth: this.config.stepWidth,
            stepsPerBar: this.config.stepsPerBar,
            totalSteps: this.config.stepsPerBar * this.config.bars,
            totalWidth: this.config.stepWidth * this.config.stepsPerBar * this.config.bars
        };
    }

    createControls() {
        const controls = document.createElement('div');
        controls.className = 'piano-roll-controls';
        
        controls.innerHTML = `
            <div class="mode-group">
                <button class="mode-btn ${this.mode === 'compose' ? 'active' : ''}" data-mode="compose">Edit</button>
                <button class="mode-btn ${this.mode === 'play' ? 'active' : ''}" data-mode="play">Play</button>
            </div>
            <div class="bar-controls">
                <button class="prev-bar">◀</button>
                <span class="bar-display">Bar 1 of ${this.config.bars}</span>
                <button class="next-bar">▶</button>
            </div>
            <div class="control-group">
                <label>Bars:</label>
                <input type="number" min="1" max="16" value="${this.config.bars}" class="bars-input">
            </div>
        `;

        this.setupControlEvents(controls);
        return controls;
    }

    createPianoKeys(container) {
        const pianoKeys = document.createElement('div');
        pianoKeys.className = 'piano-keys';
        pianoKeys.style.height = `${this.config.totalHeight}px`; // Set fixed height
        
        const notes = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C']; // Ordine invertito
        
        // Create keys from highest to lowest octave
        for (let octave = this.config.startOctave + this.config.octaves - 1; octave >= this.config.startOctave; octave--) {
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
        gridContainer.style.height = `${this.config.totalHeight}px`; // Match piano keys height
        
        const grid = document.createElement('div');
        grid.className = 'note-grid';
        grid.style.width = `${this.config.totalWidth}px`;
        grid.style.height = '100%';

        // Create background grid for notes (horizontal lines)
        const notes = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C']; // Ordine invertito
        const totalRows = this.config.octaves * 12;
        
        // Crea le linee dalla più alta alla più bassa
        for (let i = 0; i <= totalRows; i++) {
            const line = document.createElement('div');
            line.className = 'horizontal-grid-line';
            line.style.top = `${i * this.config.noteHeight}px`;
            
            // Calcola la nota corrente
            const noteIndex = i % 12;
            const note = notes[noteIndex];
            line.dataset.note = note;
            
            grid.appendChild(line);
        }

        this.createGridLines(grid);
        this.createPlayhead(grid);
        
        gridContainer.appendChild(grid);
        container.appendChild(gridContainer);
        this.grid = grid;
    }

    createGridLines(grid) {
        const dimensions = this.calculateGridDimensions();
        const fragment = document.createDocumentFragment();

        // Create bar lines and step lines
        for (let bar = 0; bar <= this.config.bars; bar++) {
            const barX = bar * dimensions.stepWidth * dimensions.stepsPerBar;
            
            // Create bar line
            if (bar < this.config.bars) {
                const barLine = document.createElement('div');
                barLine.className = 'grid-line bar';
                barLine.style.left = `${barX}px`;
                fragment.appendChild(barLine);

                // Create step lines within each bar
                for (let step = 1; step < dimensions.stepsPerBar; step++) {
                    const stepX = barX + (step * dimensions.stepWidth);
                    const stepLine = document.createElement('div');
                    stepLine.className = 'grid-line step';
                    stepLine.style.left = `${stepX}px`;
                    fragment.appendChild(stepLine);
                }
            }
        }

        grid.appendChild(fragment);
    }

    createPlayhead(grid) {
        // Add playhead
        this.playhead = document.createElement('div');
        this.playhead.className = 'playhead';
        grid.appendChild(this.playhead);
    }

    updatePlayhead(beatData) {
        if (!this.grid || !this.playhead) return;

        const stepWidth = this.config.stepWidth;
        const position = beatData.stepIndex * stepWidth;
        
        this.playhead.style.left = `${position}px`;
        
        // Auto-scroll solo in modalità play
        if (this.mode === 'play') {
            const container = this.grid.parentElement;
            if (position > container.scrollLeft + container.clientWidth || 
                position < container.scrollLeft) {
                container.scrollLeft = position - (container.clientWidth / 2);
            }
        }

        // Aggiorna il display della battuta corrente
        const currentBar = Math.floor(beatData.stepIndex / this.config.stepsPerBar);
        const barDisplay = this.element.querySelector('.bar-display');
        if (barDisplay && this.mode === 'compose') {
            this.currentBar = currentBar;
            this.updateBarDisplay(barDisplay);
        }
    }

    resetPlayhead() {
        this.playhead.style.left = '0px';
        this.grid.parentElement.scrollLeft = 0;
    }

    setupEventListeners() {
        this.grid.addEventListener('mousedown', (e) => {
            if (e.button === 2) return; // Skip right click
            this.handleGridMouseDown(e);
        });
        this.grid.addEventListener('mousemove', (e) => this.handleGridMouseMove(e));
        this.grid.addEventListener('mouseup', () => this.handleGridMouseUp());
        this.grid.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    }

    handleGridMouseDown(e) {
        this.isDragging = true;
        this.addNote(e);
    }

    handleGridMouseMove(e) {
        if (this.isDragging && this.currentNote) {
            const width = Math.max(this.noteWidth, e.offsetX - this.currentNote.offsetLeft);
            const gridWidth = Math.ceil(width / this.noteWidth) * this.noteWidth;
            
            this.currentNote.style.width = `${gridWidth}px`;
            
            // Aggiorna la durata della nota in termini di beats
            const noteId = this.currentNote.dataset.noteId;
            const beats = gridWidth / this.noteWidth;
            this.updateNoteDuration(noteId, beats);

            console.log('Note duration updated:', {
                width: gridWidth,
                beats: beats,
                noteId: noteId
            });
        }
    }

    handleGridMouseUp() {
        this.isDragging = false;
        this.currentNote = null;
    }

    handleContextMenu(e) {
        e.preventDefault();

        const noteElement = e.target.closest('.note');
        if (!noteElement) return;

        const noteId = Number(noteElement.dataset.noteId);
        
        // Aggiungi feedback visivo prima della rimozione
        noteElement.classList.add('removing');
        
        // Rimuovi dopo l'animazione
        setTimeout(() => {
            if (this.pianoRoll.removeNote(noteId)) {
                this.noteElements.delete(noteId);
                noteElement.remove();
                console.log('Note removed:', noteId);
            }
        }, 200);
    }

    addNote(e) {
        const noteId = Date.now();
        const gridRect = this.grid.getBoundingClientRect();
        const x = e.clientX - gridRect.left;
        const y = e.clientY - gridRect.top;
        
        // Calculate step position
        const stepIndex = Math.floor(x / this.config.stepWidth);
        const totalSteps = this.config.stepsPerBar * this.config.bars;
        
        // Convert to timing ratio (0-1 range)
        const startTime = stepIndex / totalSteps;
        
        const noteData = {
            id: noteId,
            pitch: this.calculatePitch(y),
            startTime: startTime,
            duration: 1/16, // Fixed duration for now
            velocity: 1
        };

        if (this.pianoRoll.addNote(noteData)) {
            const quantizedX = stepIndex * this.config.stepWidth;
            const quantizedY = Math.floor(y / this.config.noteHeight) * this.config.noteHeight;
            this.createNoteElement(noteData, quantizedX, quantizedY);
        }
    }

    calculatePitch(y) {
        const totalNotes = this.config.octaves * 12;
        const noteIndex = Math.floor(y / this.config.noteHeight);
        return totalNotes - noteIndex + (this.config.startOctave * 12) - 1;
    }

    createNoteElement(noteData, x, y) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.dataset.noteId = noteData.id;
        
        noteElement.style.left = `${x}px`;
        noteElement.style.top = `${y}px`;
        noteElement.style.width = `${this.config.stepWidth}px`; // One step width
        noteElement.style.height = `${this.config.noteHeight}px`;
        
        this.grid.appendChild(noteElement);
        this.noteElements.set(noteData.id, noteElement);
        this.currentNote = noteElement;
        
        this.updateNoteInfo(noteElement, noteData.pitch, noteData.duration);
        
        return noteElement;
    }

    updateNoteInfo(noteElement, pitch, duration) {
        const freq = this.midiNoteToFrequency(pitch);
        noteElement.title = `Note: ${pitch} (${freq.toFixed(1)}Hz)\nDuration: ${duration} beats`;
        
        // Optional: Add visual label
        if (!noteElement.querySelector('.note-label')) {
            const label = document.createElement('span');
            label.className = 'note-label';
            label.textContent = `${freq.toFixed(0)}Hz`;
            noteElement.appendChild(label);
        }
    }

    removeNote(noteId) {
        return this.pianoRoll.removeNote(noteId);
    }

    updateNoteDuration(noteId, duration) {
        const note = this.pianoRoll.notes.find(n => n.id.toString() === noteId);
        if (note) {
            note.duration = duration;
        }
    }

    updateNoteInfo(noteElement, pitch, duration) {
        const freq = this.midiNoteToFrequency(pitch);
        noteElement.title = `Note: ${pitch} (${freq.toFixed(1)}Hz)\nDuration: ${duration} beats`;
        
        const label = document.createElement('span');
        label.className = 'note-label';
        label.textContent = `${freq.toFixed(0)}Hz - ${duration}b`;
        noteElement.appendChild(label);
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
                    
                    // Assicurati che la durata sia definita e maggiore di zero
                    const duration = Math.max(0.1, noteInfo.duration || 0.1);
                    
                    // Avvia la nota
                    osc.start(time);
                    
                    // Programma lo stop della nota
                    const stopTime = time + duration;
                    osc.stop(stopTime);

                    console.log('Note scheduled:', {
                        frequency: freq,
                        startTime: time,
                        stopTime: stopTime,
                        duration: duration
                    });

                    // Feedback visuale con durata corretta
                    this.triggerVisualFeedback(oscillatorPanel, duration);
                } catch (error) {
                    console.error('Error triggering oscillator:', error);
                }
            }
        };

        this.pianoRoll.addTarget(target);
        oscillatorPanel.setConnected(true);
    }

    midiNoteToFrequency(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    triggerVisualFeedback(oscillatorPanel, duration) {
        const panel = oscillatorPanel.element;
        panel.classList.add('triggered');
        // Usa la durata effettiva della nota per il feedback visuale
        setTimeout(() => panel.classList.remove('triggered'), duration * 1000);
    }

    dispose() {
        this.pianoRoll.dispose();
        super.dispose();
    }

    areSetsEqual(a, b) {
        return a.size === b.size && 
               [...a].every(value => b.has(value));
    }

    setupControlEvents(controls) {
        // Bar navigation
        const prevBar = controls.querySelector('.prev-bar');
        const nextBar = controls.querySelector('.next-bar');
        const barDisplay = controls.querySelector('.bar-display');
        const barsInput = controls.querySelector('.bars-input');
        const modeButtons = controls.querySelectorAll('.mode-btn');

        // Mode switching
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.updateMode();
            });
        });

        // Bar navigation
        prevBar?.addEventListener('click', () => {
            this.currentBar = Math.max(0, this.currentBar - 1);
            this.updateBarDisplay(barDisplay);
            this.scrollToBar(this.currentBar);
        });

        nextBar?.addEventListener('click', () => {
            this.currentBar = Math.min(this.config.bars - 1, this.currentBar + 1);
            this.updateBarDisplay(barDisplay);
            this.scrollToBar(this.currentBar);
        });

        // Number of bars
        barsInput?.addEventListener('change', (e) => {
            const newBars = Math.max(1, Math.min(16, parseInt(e.target.value)));
            
            // Update configuration
            this.config.bars = newBars;
            
            // Update transport with new configuration
            this.transport.stop(); // Stop playback before changing
            this.transport.bars = newBars;
            this.transport.totalSteps = newBars * this.config.stepsPerBar;
            this.transport.reset(); // Reset transport state

            // Update grid
            this.updateGridWithOriginalSteps();
            this.updateBarDisplay(controls.querySelector('.bar-display'));
        });
    }

    updateGridWithOriginalSteps() {
        if (!this.grid) return;

        // 1. Salva le note esistenti con le loro posizioni attuali
        const currentNotes = Array.from(this.grid.querySelectorAll('.note')).map(noteElement => {
            return {
                id: noteElement.dataset.noteId,
                element: noteElement,
                left: parseInt(noteElement.style.left),
                top: parseInt(noteElement.style.top),
                width: parseInt(noteElement.style.width),
                pitch: this.calculatePitch(parseInt(noteElement.style.top))
            };
        });

        // 2. Aggiorna le dimensioni della griglia
        const totalSteps = this.config.stepsPerBar * this.config.bars;
        this.config.totalWidth = this.config.stepWidth * totalSteps;
        this.grid.style.width = `${this.config.totalWidth}px`;
        
        // 3. Ricrea la griglia
        this.grid.innerHTML = '';

        // 4. Ricrea le linee orizzontali per le note con i colori corretti
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const totalRows = this.config.octaves * 12;
        
        for (let i = 0; i <= totalRows; i++) {
            const line = document.createElement('div');
            line.className = 'horizontal-grid-line';
            line.style.top = `${i * this.config.noteHeight}px`;
            
            const noteIndex = (totalRows - i) % 12;
            const note = notes[noteIndex];
            line.dataset.note = note;
            
            this.grid.appendChild(line);
        }

        // 5. Ricrea le linee verticali della griglia
        this.createGridLines(this.grid);
        this.createPlayhead(this.grid);

        // 6. Riposiziona le note
        currentNotes.forEach(note => {
            // Mantieni la stessa posizione relativa
            const stepIndex = Math.floor(note.left / this.config.stepWidth);
            
            if (stepIndex < totalSteps) {
                const noteElement = document.createElement('div');
                noteElement.className = 'note';
                noteElement.dataset.noteId = note.id;
                noteElement.style.left = `${stepIndex * this.config.stepWidth}px`;
                noteElement.style.top = `${note.top}px`;
                noteElement.style.width = `${this.config.stepWidth}px`;
                noteElement.style.height = `${this.config.noteHeight}px`;
                
                this.grid.appendChild(noteElement);
                this.noteElements.set(note.id, noteElement);

                const startTime = stepIndex / totalSteps;
                const noteData = {
                    id: parseInt(note.id),
                    pitch: note.pitch,
                    startTime: startTime,
                    duration: 1/16,
                    velocity: 1
                };

                this.pianoRoll.removeNote(noteData.id);
                this.pianoRoll.addNote(noteData);
                
                this.updateNoteInfo(noteElement, noteData.pitch, noteData.duration);
            }
        });

        this.setupEventListeners();
    }

    setupTransportListener() {
        const listener = {
            onTransportEvent: (event, data) => {
                switch(event) {
                    case 'beat':
                        this.updatePlayhead(data);
                        break;
                    case 'stop':
                        this.resetPlayhead();
                        break;
                }
            }
        };
        this.transport.addListener(listener);
    }

    updateMode() {
        const controls = this.element.querySelector('.bar-controls');
        controls.style.display = this.mode === 'compose' ? 'flex' : 'none';
        
        if (this.mode === 'compose') {
            this.scrollToBar(this.currentBar);
        }
    }

    updateBarDisplay(display) {
        if (display) {
            display.textContent = `Bar ${this.currentBar + 1} of ${this.config.bars}`;
        }
    }

    scrollToBar(barIndex) {
        const barWidth = this.config.stepWidth * this.config.stepsPerBar;
        const position = barWidth * barIndex;
        
        const container = this.grid.parentElement;
        if (container) {
            container.scrollLeft = position - (container.clientWidth / 3);
        }
    }
}
