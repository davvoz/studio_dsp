import Panel from '../components/Panel.js';

export default class MIDIPanel extends Panel {
    constructor(midiManager) {
        super('midiPanel', {
            title: 'MIDI Mapping',
            width: '300px',
            height: 'auto',
            collapsible: true,
            draggable: true,
            className: 'midi-panel',
            content: `
                <div class="midi-status">
                    <h3>MIDI Status</h3>
                    <div id="midiStatus">Initializing...</div>
                </div>
                <div class="midi-learn">
                    <h3>MIDI Learn</h3>
                    <button id="midiLearnBtn" class="learn-btn">Start MIDI Learn</button>
                    <div id="midiLearnStatus"></div>
                </div>
                <div class="midi-mappings">
                    <h3>Current Mappings</h3>
                    <div id="midiMappings"></div>
                </div>
            `
        });

        this.midiManager = midiManager;
        // Rimuoviamo il this.create() da qui
    }

    initialize() {
        // Questa verrà chiamata dopo che UIManager ha creato il pannello
        this.setupMIDIListeners();
    }

    setupMIDIListeners() {
        this.midiManager.on('statechange', () => this.updateMIDIStatus());
        this.updateMIDIStatus();
    }

    updateMIDIStatus() {
        const statusElement = this.element.querySelector('#midiStatus');
        if (!statusElement) return;

        const inputs = this.midiManager.getInputs();
        statusElement.innerHTML = inputs.length ? 
            `Connected devices:<br>${inputs.map(input => `- ${input.name}`).join('<br>')}` :
            'No MIDI devices connected';
        statusElement.className = inputs.length ? 'status-ok' : 'status-error';
    }

    setPosition(x, y) {
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }
}
