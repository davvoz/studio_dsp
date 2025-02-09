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

        // Aggiungi indicatore connessione
        this.connectionIndicator = document.createElement('div');
        this.connectionIndicator.className = 'connection-indicator';
        this.connectionIndicator.innerHTML = '⚡ Connected to Sequencer';
        this.connectionIndicator.style.display = 'none';
        content.appendChild(this.connectionIndicator);
    }

    setupControls() {
        const sliders = [
            {
                id: `${this.id}_frequency`,  // Prefisso con l'ID del pannello
                min: 20,
                max: 2000,
                step: 0.1,
                initialValue: 440,
                label: 'Frequency (Hz)',
                onChange: (value) => {
                    const freq = parseFloat(value);
                    this.frequency = freq; // Store current frequency
                    this.oscillator.setParameter('frequency', freq);
                    // Non avviare l'oscillatore qui
                }
            },
            {
                id: `${this.id}_mix`,
                min: 0,
                max: 1,
                step: 0.01,
                initialValue: 0, // Parti con volume a zero
                label: 'Mix',
                midiCC: 8,
                onChange: (value) => this.oscillator.setParameter('mix', parseFloat(value))
            }
        ];

        sliders.forEach(config => {
            const control = new MIDIMappableSlider({
                ...config,
                midiManager: this.midiManager,
                className: 'oscillator-control'
            });
            // Aggiungi label con ID per referenza
            const label = document.createElement('label');
            label.setAttribute('for', config.id);
            label.textContent = config.label;
            
            this.addControl(control);
            control.setValue(config.initialValue);
            
            // Trigger onChange per impostare il valore iniziale
            config.onChange(config.initialValue);
        });

        // Aggiungi listener per mostrare/nascondere il controllo PWM
        const waveformSelect = this.element.querySelector('select');
        if (waveformSelect) {
            waveformSelect.addEventListener('change', (e) => {
                const isPWM = parseInt(e.target.value) === Oscillator.WAVEFORMS.PWM;
                const pwmControl = this.controls.get(`${this.id}_pwm`);
                if (pwmControl) {
                    pwmControl.element.parentElement.style.display = isPWM ? 'block' : 'none';
                }
            });
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
        // Rimuovi la chiamata a unregisterControl
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


