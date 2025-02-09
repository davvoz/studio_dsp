import Oscillator from '../../core/audio/components/Oscillator.js';
import Panel from '../components/Panel.js';
import MIDIMappableSlider from '../components/controls/MIDIMappableSlider.js';

export default class OscillatorPanel extends Panel {
    constructor(audioEngine, midiManager) {
        super('oscillator-panel', {
            title: 'DSP Oscillator',
            width: '400px',
            height: 'auto',
            draggable: true,
            collapsible: true,
            className: 'oscillator-panel'
        });
        
        if (!audioEngine || !audioEngine.audioContext) {
            throw new Error('AudioEngine with valid audioContext is required');
        }

        if (!midiManager) {
            throw new Error('MIDIManager is required');
        }
        
        this.audioEngine = audioEngine;
        this.midiManager = midiManager;
        this.oscillator = new Oscillator(this.audioEngine.audioContext, `osc_${Date.now()}`);

        this.isPlaying = false;
        this.controls = new Map();
        this.frequency = 440; // Add this line to store current frequency
    }

    create() {
        super.create();
        
        this.element.classList.add('oscillator-panel');
        const content = this.element.querySelector('.panel-content');
        
        // Add visual divider after title
        const divider = document.createElement('div');
        divider.className = 'panel-divider';
        content.appendChild(divider);
        
        this.createWaveformSelector();
        this.audioEngine.registerComponent(this.oscillator);
    }

    setupControls() {
        const sliders = [
            {
                id: `${this.id}_frequency_mod`,  // Rinominato per chiarezza
                min: 0,  // Range modificato per essere relativo
                max: 2000,
                step: 0.1,
                initialValue: 0,  // Partiamo da 0 (nessuna modifica)
                label: 'Frequency Mod (Hz)',
                onChange: (value) => {
                    const baseFreq = this.oscillator.getCurrentBaseFrequency();
                    const modValue = parseFloat(value);
                    const newFreq = baseFreq + modValue;
                    console.log('Modulating frequency:', {base: baseFreq, mod: modValue, new: newFreq});
                    this.oscillator.setParameter('frequency', newFreq);
                }
            },
            {
                id: `${this.id}_mix_mod`,
                min: 0,
                max: 1,
                step: 0.01,
                initialValue: 0.5,
                label: 'Mix Mod',
                midiCC: 8,
                onChange: (value) => {
                    const mix = parseFloat(value);
                    this.oscillator.setParameter('mix', mix);
                }
            }
        ];

        // Crea i controlli
        sliders.forEach(config => {
            const control = new MIDIMappableSlider({
                ...config,
                midiManager: this.midiManager,
                className: 'oscillator-control'
            });
            
            this.addControl(control);
            control.setValue(config.initialValue);
            this.controls.set(config.id, control);
        });
    }

    updateControlsFromOscillator() {
        const freqControl = this.controls.get(`${this.id}_frequency`);
        const mixControl = this.controls.get(`${this.id}_mix`);

        if (freqControl && this.oscillator) {
            const currentFreq = this.oscillator.getCurrentFrequency();
            if (currentFreq !== this.frequency) {
                freqControl.setValue(currentFreq, true); // true = silent update
            }
        }

        if (mixControl && this.oscillator) {
            const currentMix = this.oscillator.getCurrentMix();
            if (currentMix !== mixControl.getValue()) {
                mixControl.setValue(currentMix, true);
            }
        }
    }

    addControl(control) {
        // Find or create the controls container
        let controlsContainer = this.element.querySelector('.controls-container');
        

        const controlContainer = document.createElement('div');
        controlContainer.className = 'control-container';
        
        const element = control.createElement();
        if (element) {
            controlContainer.appendChild(element);
            controlsContainer.appendChild(controlContainer);
        }

        this.controls.set(control.id, control);
        return control;
    }

    createControl(ControlClass, options) {
        const control = new ControlClass({
            ...options,
            midiManager: this.midiManager // Assicurati che questo venga passato
        });
        
        // Aggiungi debug per verificare la creazione del controllo
        console.log('Created control:', control.id, control);
        
        return this.addControl(control);
    }

    createWaveformSelector() {
        const waveformSection = document.createElement('div');
        waveformSection.className = 'waveform-section';
        
        const waveformSelect = document.createElement('select');
        
        const waveforms = {
            'Sine Wave': Oscillator.WAVEFORMS.SINE,
            'Square Wave': Oscillator.WAVEFORMS.SQUARE,
            'Sawtooth Wave': Oscillator.WAVEFORMS.SAWTOOTH,
            'Triangle Wave': Oscillator.WAVEFORMS.TRIANGLE,
            'White Noise': Oscillator.WAVEFORMS.WHITE_NOISE
        };

        Object.entries(waveforms).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = key;
            waveformSelect.appendChild(option);
        });

        waveformSelect.addEventListener('change', (e) => {
            this.oscillator.setParameter('waveform', parseInt(e.target.value));
        });

        this.addLabel(waveformSection, 'Waveform Type', waveformSelect);
        
        let controlsContainer = this.element.querySelector('.controls-container');
       
        
        controlsContainer.insertBefore(waveformSection, controlsContainer.firstChild);
    }

    setConnected(isConnected) {
        if (this.connectionIndicator) {
            this.connectionIndicator.style.display = isConnected ? 'block' : 'none';
        }
    }

    addLabel(container, text, element) {
        const label = document.createElement('label');
        label.textContent = text;
        container.appendChild(label);
        container.appendChild(element);
        return container;
    }

    dispose() {
        if (this.updateControlsInterval) {
            clearInterval(this.updateControlsInterval);
        }
        this.audioEngine.unregisterComponent(this.oscillator.id);
        super.dispose();
    }

    getFrequency() {
        return this.frequency || 440;
    }

    getOscillator() {
        return this.oscillator;
    }
}


