import UIManager from './UI/UIManager.js';
import MIDIManager from './core/midi/MIDIManager.js';
import MIDIPanel from './UI/panels/MIDIPanel.js';
import OscillatorPanel from './UI/panels/OscillatorPanel.js';
import AudioEngine from './core/audio/AudioEngine.js';
import PianoRollPanel from './UI/panels/PianoRollPanel.js';
import TransportPanel from './UI/panels/TransportPanel.js';
import MetronomePanel from './UI/panels/MetronomePanel.js';

class StudioDSPDemo {
    constructor() {
        this.uiManager = new UIManager();
        this.midiManager = new MIDIManager();
        this.audioEngine = new AudioEngine();
        this.controlsRegistry = new Map();
    }

    async initialize() {
        // Initialize Audio Engine
        await this.audioEngine.initialize();
        
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
        metronomePanel.setPosition(360, 20);

        // Adjust other panels' positions
        const midiPanel = new MIDIPanel(this.midiManager);
        this.uiManager.addComponent(midiPanel);
        midiPanel.initialize();
        midiPanel.setPosition(10, 200);

        const oscillatorPanel = new OscillatorPanel(this.audioEngine, this.midiManager);
        this.uiManager.addComponent(oscillatorPanel);
        oscillatorPanel.setupControls();
        oscillatorPanel.setPosition(400, 500);

        const pianoRollPanel = new PianoRollPanel(this.audioEngine);
        this.uiManager.addComponent(pianoRollPanel);
        pianoRollPanel.setPosition(10, 380);

        // Connect piano roll to oscillator
        pianoRollPanel.connectToOscillator(oscillatorPanel);
    }
}

// Start the application
const demo = new StudioDSPDemo();
demo.initialize().catch(console.error);

