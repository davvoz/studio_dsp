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
                id: `${this.id}_masterVolume`,  // Prefisso con l'ID del pannello
                label: 'Master Volume',
                initialValue: 100,
                min: 0,
                max: 100
            }
        );

        // Reverb Controls
        const reverbMix = this.createControl(
            MIDIMappableSlider,
            {
                id: `${this.id}_reverbMix`,  // Prefisso con l'ID del pannello
                label: 'Reverb Mix',
                initialValue: 0,
                disabled: true,
                min: 0,
                max: 100
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

        // Rimuovi le chiamate a registerControl che non esistono più
        // this.midiManager.registerControl('masterVolume', volumeControl);
        // this.midiManager.registerControl('reverbMix', reverbMix);
    }

    addControl(control) {
        const controlContainer = document.createElement('div');
        controlContainer.className = 'control-container';
        
        // Use createElement instead of create
        const element = control.createElement();
        if (element) {
            controlContainer.appendChild(element);
            this.element.appendChild(controlContainer);
        }

        // Store the control
        this.controls.set(control.id, control);
        return control;
    }

    createControl(ControlClass, options) {
        const control = new ControlClass({
            ...options,
            midiManager: this.midiManager
        });
        return this.addControl(control);
    }
}
