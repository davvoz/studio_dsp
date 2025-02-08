import UIManager from './UI/UIManager.js';
import MIDIManager from './core/midi/MIDIManager.js';
import MainPanel from './UI/panels/MainPanel.js';
import MIDIPanel from './UI/panels/MIDIPanel.js';
import OscillatorPanel from './UI/panels/OscillatorPanel.js';
import AudioEngine from './core/audio/AudioEngine.js';  // Add this import

class StudioDSPDemo {
    constructor() {
        this.uiManager = new UIManager();
        this.midiManager = new MIDIManager();
        this.audioEngine = new AudioEngine();  // Add AudioEngine instance
        this.controlsRegistry = new Map();
    }

    async initialize() {
        // Initialize Audio Engine
        await this.audioEngine.initialize();  // Add this line
        
        // Initialize MIDI
        const midiInitialized = await this.midiManager.initialize();
        if (!midiInitialized) {
            console.warn('MIDI not available');
        }

        // Create panels
        const mainPanel = new MainPanel(this.midiManager);
        const midiPanel = new MIDIPanel(this.midiManager);
        const oscillatorPanel = new OscillatorPanel(this.audioEngine);  // Pass audioEngine instead of midiManager

        // Add panels to UI and position them
        this.uiManager.addComponent(mainPanel);
        mainPanel.setupControls();
        mainPanel.setPosition(20, 20);

        this.uiManager.addComponent(midiPanel);
        midiPanel.initialize();
        midiPanel.setPosition(440, 20);

        this.uiManager.addComponent(oscillatorPanel);
        oscillatorPanel.setPosition(20, 300);
    }
}

// Start the application
const demo = new StudioDSPDemo();
demo.initialize().catch(console.error);

