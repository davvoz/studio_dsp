import Panel from '../components/Panel.js';
import PianoRoll from '../../core/audio/components/PianoRoll.js';

export default class PianoRollPanel extends Panel {
    constructor(audioEngine) {
        super('piano-roll-panel', {
            title: 'Piano Roll',
            width: '900px',
            height: '400px',
            draggable: true,
            collapsible: true
        });

        this.audioEngine = audioEngine;
        this.transport = audioEngine.getTransport();

        // Create PianoRoll instance
        this.pianoRoll = new PianoRoll(audioEngine.audioContext, 'piano-roll-' + Date.now());
        this.pianoRoll.setTransport(this.transport);

        // Grid settings (16 steps per bar)
        this.config = {
            noteHeight: 20,
            stepWidth: 30,     // Larghezza di uno step
            stepsPerBar: 16,   // 16 step per battuta
            bars: 4,
            octaves: 4,
            startOctave: 3
        };

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
        
        const content = this.element.querySelector('.panel-content');
        
        // Aggiungi controlli griglia
        const controls = this.createControls();
        
        // Inserisci i controlli prima del container del piano roll
        content.insertBefore(controls, content.firstChild);
        
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
        
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
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

    updateGridDimensions() {
        const totalBeats = this.numberOfBars * this.beatsPerBar;
        const totalSubdivisions = totalBeats * this.currentResolution.subbeats;
        this.gridWidth = totalBeats * this.beatWidth;
        this.subdivisionWidth = this.beatWidth / this.currentResolution.subbeats;
        return { totalBeats, totalSubdivisions };
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
        for (let i = 0; i <= this.config.octaves * 12; i++) {
            const line = document.createElement('div');
            line.className = 'horizontal-grid-line';
            line.style.top = `${i * this.config.noteHeight}px`;
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
            // Previeni l'aggiunta di note con il tasto destro
            if (e.button === 2) return; // 2 è il tasto destro
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
        if (e.target.classList.contains('note')) {
            const noteId = Number(e.target.dataset.noteId);
            const noteElement = this.noteElements.get(noteId);
            
            if (noteElement && this.pianoRoll.removeNote(noteId)) {
                noteElement.remove();
                this.noteElements.delete(noteId);
            }
        }
    }

    setupGridEvents() {
        let lastMousePosition = null;
        
        const handleMouseDown = (e) => {
            if (e.button === 2) return; // Skip right click
            lastMousePosition = { x: e.clientX, y: e.clientY };
            this.isDragging = true;
            this.addNote(e);
        };
        
        const handleMouseMove = (e) => {
            if (!this.isDragging || !this.currentNote) return;
            
            const deltaX = e.clientX - lastMousePosition.x;
            if (Math.abs(deltaX) >= this.subdivisionWidth) {
                const newWidth = Math.max(
                    this.subdivisionWidth,
                    Math.round(parseInt(this.currentNote.style.width) / this.subdivisionWidth) * this.subdivisionWidth
                );
                this.resizeNote(this.currentNote, newWidth);
                lastMousePosition.x = e.clientX;
            }
        };
        
        const handleMouseUp = () => {
            this.isDragging = false;
            this.currentNote = null;
            lastMousePosition = null;
        };

        this.grid.addEventListener('mousedown', handleMouseDown);
        this.grid.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        this.grid.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }

    resizeNote(noteElement, newWidth) {
        noteElement.style.width = `${newWidth}px`;
        const noteId = noteElement.dataset.noteId;
        const duration = newWidth / this.beatWidth;
        this.updateNoteDuration(noteId, duration);
    }

    quantizePosition(pos) {
        const { subdivisionWidth } = this.calculateGridDimensions();
        const snapDiv = parseInt(this.currentSettings.snap.split('/')[1]);
        const snapWidth = this.baseBeatWidth * 4 / snapDiv * (this.gridSettings.zoom / 100);
        return Math.round(pos / snapWidth) * snapWidth;
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
        
        // Aggiungi indicatore di connessione
        const connectionIndicator = document.createElement('div');
        connectionIndicator.className = 'connection-indicator';
        connectionIndicator.textContent = '⚡ Connected to Oscillator';
        this.element.querySelector('.panel-content').appendChild(connectionIndicator);
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

    // Aggiungi un metodo per visualizzare tutte le note
    showAllNotes() {
        console.log('All notes in grid:', Array.from(this.grid.querySelectorAll('.note'))
            .map(el => ({
                id: el.dataset.noteId,
                left: el.style.left,
                top: el.style.top
            }))
        );
    }

    // Aggiungi questo nuovo metodo per verificare la sincronizzazione
    verifyNoteSync() {
        const storedNotes = new Set(this.pianoRoll._notes.keys());
        const domNotes = new Set(
            Array.from(this.grid.querySelectorAll('.note'))
                .map(el => parseInt(el.dataset.noteId))
        );
        
        console.log('Note sync check:', {
            stored: Array.from(storedNotes),
            dom: Array.from(domNotes),
            inSync: this.areSetsEqual(storedNotes, domNotes)
        });
    }

    areSetsEqual(a, b) {
        return a.size === b.size && 
               [...a].every(value => b.has(value));
    }

    setGridDivision(division) {
        this.currentDivision = division;
        this.gridColumns = this.currentDivision * this.numberOfBars;
        this.updateGrid();
    }

    setNumberOfBars(bars) {
        this.numberOfBars = bars;
        this.gridColumns = this.currentDivision * this.numberOfBars;
        this.updateGrid();
    }

    updateGrid(oldBars) {
        if (!this.grid) return;
        
        const totalSteps = this.config.stepsPerBar * this.config.bars;
        const oldTotalSteps = this.config.stepsPerBar * (oldBars || this.config.bars);
        
        // Store notes with their timing information
        const notes = Array.from(this.grid.querySelectorAll('.note')).map(note => {
            const currentX = parseInt(note.style.left);
            const currentStep = Math.floor(currentX / this.config.stepWidth);
            
            // Calculate the current timing as a ratio of total steps
            const currentTiming = currentStep / oldTotalSteps;
            
            return {
                element: note,
                timing: currentTiming,
                pitch: parseInt(note.style.top) / this.config.noteHeight,
                noteId: note.dataset.noteId
            };
        });

        // Update grid dimensions
        this.config.totalWidth = this.config.stepWidth * totalSteps;
        this.grid.style.width = `${this.config.totalWidth}px`;
        
        // Recreate grid
        this.grid.innerHTML = '';
        this.createGridLines(this.grid);

        // Reposition notes maintaining their relative timing
        notes.forEach(note => {
            // Convert timing ratio back to steps in new grid
            const newStep = Math.floor(note.timing * totalSteps);
            const x = newStep * this.config.stepWidth;
            const y = note.pitch * this.config.noteHeight;
            
            note.element.style.left = `${x}px`;
            note.element.style.top = `${y}px`;
            this.grid.appendChild(note.element);

            // Update note timing data in the PianoRoll
            const startTime = note.timing; // Keep original timing ratio
            const existingNote = this.pianoRoll.notes.find(n => n.id.toString() === note.noteId);
            if (existingNote) {
                existingNote.startTime = startTime;
            }
        });

        // Recreate playhead
        this.createPlayhead(this.grid);
        this.setupEventListeners();
    }

    updateNoteStartTime(noteId, startTime) {
        const note = this.pianoRoll.notes.find(n => n.id.toString() === noteId);
        if (note) {
            note.startTime = startTime;
        }
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
            const oldBars = this.config.bars;
            
            // Mantieni il riferimento alle note esistenti con i loro step originali
            const existingNotes = this.pianoRoll.notes.map(note => ({
                ...note,
                originalStep: Math.floor(note.startTime * (oldBars * this.config.stepsPerBar))
            }));

            // Aggiorna la configurazione
            this.config.bars = newBars;
            
            // Aggiorna il transport senza modificare gli step delle note
            this.transport.bars = newBars;
            this.transport.totalSteps = newBars * this.config.stepsPerBar;

            // Aggiorna la griglia mantenendo gli step originali
            this.updateGridWithOriginalSteps(oldBars, existingNotes);
            this.updateBarDisplay(controls.querySelector('.bar-display'));
        });
    }

    updateGridWithOriginalSteps(oldBars, existingNotes) {
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
        this.createGridLines(this.grid);
        this.createPlayhead(this.grid);

        // 4. Riposiziona le note
        currentNotes.forEach(note => {
            // Mantieni la stessa posizione relativa
            const stepIndex = Math.floor(note.left / this.config.stepWidth);
            
            // Se la nota è ancora all'interno della nuova griglia
            if (stepIndex < totalSteps) {
                // Ricrea la nota nella stessa posizione
                const noteElement = document.createElement('div');
                noteElement.className = 'note';
                noteElement.dataset.noteId = note.id;
                noteElement.style.left = `${stepIndex * this.config.stepWidth}px`;
                noteElement.style.top = `${note.top}px`;
                noteElement.style.width = `${this.config.stepWidth}px`;
                noteElement.style.height = `${this.config.noteHeight}px`;
                
                this.grid.appendChild(noteElement);
                this.noteElements.set(note.id, noteElement);

                // Aggiorna il timing nel PianoRoll
                const startTime = stepIndex / totalSteps;
                const noteData = {
                    id: parseInt(note.id),
                    pitch: note.pitch,
                    startTime: startTime,
                    duration: 1/16,
                    velocity: 1
                };

                // Aggiorna o aggiungi la nota nel PianoRoll
                this.pianoRoll.removeNote(noteData.id);
                this.pianoRoll.addNote(noteData);
                
                // Aggiorna le informazioni visive della nota
                this.updateNoteInfo(noteElement, noteData.pitch, noteData.duration);
            }
        });

        // 5. Debug info
        console.log('Grid update complete:', {
            totalNotes: currentNotes.length,
            visibleNotes: this.grid.querySelectorAll('.note').length,
            gridWidth: this.config.totalWidth
        });

        this.setupEventListeners();
    }

    updateGrid(newWidth) {
        if (!this.grid) return;
        
        // Calculate current grid dimensions
        const { beatWidth, subdivisionWidth } = this.calculateGridDimensions();
        const totalWidth = this.config.bars * this.config.beatsPerBar * beatWidth;
        
        // Store references to existing notes and their relative positions
        const notes = Array.from(this.grid.querySelectorAll('.note')).map(note => ({
            element: note,
            relativeX: parseInt(note.style.left) / this.grid.clientWidth,
            duration: parseInt(note.style.width) / beatWidth // Store duration in beats
        }));

        // Update grid dimensions
        this.grid.style.width = `${totalWidth}px`;
        
        // Clear and recreate grid lines
        const oldLines = this.grid.querySelectorAll('.grid-line');
        oldLines.forEach(line => line.remove());
        this.createGridLines(this.grid);

        // Reposition notes with correct scaling
        notes.forEach(note => {
            const newX = note.relativeX * totalWidth;
            const newWidth = note.duration * beatWidth;
            
            note.element.style.left = `${Math.round(newX)}px`;
            note.element.style.width = `${Math.round(newWidth)}px`;
            
            // Update note data
            const noteId = note.element.dataset.noteId;
            this.updateNoteDuration(noteId, note.duration);
        });

        // Ensure grid container shows correct portion
        const container = this.grid.parentElement;
        requestAnimationFrame(() => {
            const maxScroll = container.scrollWidth - container.clientWidth;
            container.scrollLeft = Math.min(container.scrollLeft, maxScroll);
        });
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

    updateStepDisplay(display) {
        const bar = Math.floor(this.currentStepIndex / this.config.stepsPerBar) + 1;
        const step = (this.currentStepIndex % this.config.stepsPerBar) + 1;
        display.textContent = `${bar}.${step}`;
    }

    movePlayheadToStep(stepIndex) {
        if (!this.grid || !this.playhead) return;
        const position = stepIndex * this.config.stepWidth;
        this.playhead.style.left = `${position}px`;
        
        // Auto-scroll
        const container = this.grid.parentElement;
        container.scrollLeft = position - (container.clientWidth / 2);
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
