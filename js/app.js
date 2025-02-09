import UIManager from './UI/UIManager.js';
import MIDIManager from './core/midi/MIDIManager.js';
import MIDIPanel from './UI/panels/MIDIPanel.js';
import OscillatorPanel from './UI/panels/OscillatorPanel.js';
import AudioEngine from './core/audio/AudioEngine.js';
import SequencerPanel from './UI/panels/SequencerPanel.js';
import TransportPanel from './UI/panels/TransportPanel.js';
import MetronomePanel from './UI/panels/MetronomePanel.js';  // Add this import

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

        // Create transport panel first
        const transportPanel = new TransportPanel(this.audioEngine);
        this.uiManager.addComponent(transportPanel);
        transportPanel.setPosition(10, 20);

        // Add metronome panel
        const metronomePanel = new MetronomePanel(this.audioEngine);
        this.uiManager.addComponent(metronomePanel);
        metronomePanel.setPosition(360, 20);  // Position next to transport

        // Adjust other panels' positions
        const midiPanel = new MIDIPanel(this.midiManager);
        this.uiManager.addComponent(midiPanel);
        midiPanel.initialize();
        midiPanel.setPosition(10, 200);  // Moved down

        const oscillatorPanel = new OscillatorPanel(this.audioEngine, this.midiManager);
        this.uiManager.addComponent(oscillatorPanel);
        oscillatorPanel.setupControls();
        oscillatorPanel.setPosition(400, 500);  // Moved down

        const sequencerPanel = new SequencerPanel(this.audioEngine);
        this.uiManager.addComponent(sequencerPanel);
        sequencerPanel.setPosition(10, 380);  // Moved down

        // Collega il sequencer all'oscillatore
        sequencerPanel.connectToOscillator(oscillatorPanel);
    }
}

// Start the application
const demo = new StudioDSPDemo();
demo.initialize().catch(console.error);

