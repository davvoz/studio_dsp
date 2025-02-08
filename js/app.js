import UIManager from './UI/UIManager.js';
import MIDIManager from './core/midi/MIDIManager.js';
import MainPanel from './UI/panels/MainPanel.js';
import MIDIPanel from './UI/panels/MIDIPanel.js';

class StudioDSPDemo {
    constructor() {
        this.uiManager = new UIManager();
        this.midiManager = new MIDIManager();
        this.controlsRegistry = new Map();
    }

    async initialize() {
        // Initialize MIDI
        const midiInitialized = await this.midiManager.initialize();
        if (!midiInitialized) {
            console.warn('MIDI not available');
        }

        // Create panels
        const mainPanel = new MainPanel(this.midiManager);
        const midiPanel = new MIDIPanel(this.midiManager);

        // Add panels to UI and position them
        this.uiManager.addComponent(mainPanel);
        mainPanel.setupControls(); // Spostiamo qui la configurazione dei controlli
        mainPanel.setPosition(20, 20);

        this.uiManager.addComponent(midiPanel);
        midiPanel.initialize(); // Inizializza dopo che UIManager ha creato il pannello
        midiPanel.setPosition(440, 20);
    }
}

// Start the application
const demo = new StudioDSPDemo();
demo.initialize().catch(console.error);

