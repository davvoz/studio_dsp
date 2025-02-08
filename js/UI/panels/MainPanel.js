import Panel from '../components/Panel.js';
import MIDIMappableSlider from '../components/controls/MIDIMappableSlider.js';
import Button from '../components/controls/Button.js';

export default class MainPanel extends Panel {
    constructor(midiManager) {
        super('mainPanel', {
            title: 'Studio DSP Demo',
            width: '400px',
            height: 'auto',
            collapsible: true,
            draggable: true,
            className: 'main-panel'
        });

        this.midiManager = midiManager;
        // Rimuoviamo this.create() da qui - verrà chiamato dall'UIManager
        this.controls = new Map(); // Assicuriamoci che i controlli siano inizializzati
    }

    setupControls() {
        // Master Volume
        const volumeControl = this.createControl(
            MIDIMappableSlider,
            {
                id: 'masterVolume',
                label: 'Master Volume',
                midiCC: 7, // Standard MIDI CC for volume
                initialValue: 100
            }
        );

        // Reverb Controls
        const reverbMix = this.createControl(
            MIDIMappableSlider,
            {
                id: 'reverbMix',
                label: 'Reverb Mix',
                midiCC: 91, // Standard MIDI CC for reverb
                initialValue: 0,
                disabled: true
            }
        );

        const reverbToggle = this.createControl(
            Button,
            {
                id: 'reverbToggle',
                text: 'Reverb',
                type: 'toggle',
                onClick: (active) => reverbMix.setDisabled(!active)
            }
        );

        // Register with MIDI manager
        this.midiManager.registerControl('masterVolume', volumeControl);
        this.midiManager.registerControl('reverbMix', reverbMix);
    }

    createControl(ControlClass, options) {
        const control = new ControlClass(options);
        this.addControl(control);
        return control;
    }
}
