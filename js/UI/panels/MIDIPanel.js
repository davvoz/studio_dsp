import Panel from '../components/Panel.js';

export default class MIDIPanel extends Panel {
    constructor(midiManager) {
        super('midiPanel', {
            title: 'MIDI Devices',
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
            `
        });

        this.midiManager = midiManager;
    }

    initialize() {
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

}
