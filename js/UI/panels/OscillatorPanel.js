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
        this.oscillator = new Oscillator(this.audioEngine.audioContext, 'osc1');
        this.isPlaying = false;
        this.controls = new Map();
    }

    create() {
        super.create();
        
        this.element.classList.add('oscillator-panel');
        this.createWaveformSelector();
        this.createPlayControl();
        this.audioEngine.registerComponent(this.oscillator);
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
                    this.oscillator.setParameter('frequency', parseFloat(value));
                }
            },
            {
                id: `${this.id}_detune`,
                min: -1200,
                max: 1200,
                step: 1,
                initialValue: 0,
                label: 'Detune (cents)',
                midiCC: 94,
                onChange: (value) => this.oscillator.setParameter('detune', parseFloat(value))
            },
            {
                id: `${this.id}_pan`,
                min: -1,
                max: 1,
                step: 0.01,
                initialValue: 0,
                label: 'Pan',
                midiCC: 10,
                onChange: (value) => this.oscillator.setParameter('pan', parseFloat(value))
            },
            {
                id: `${this.id}_mix`,
                min: 0,
                max: 1,
                step: 0.01,
                initialValue: 1,
                label: 'Mix',
                midiCC: 8,
                onChange: (value) => this.oscillator.setParameter('mix', parseFloat(value))
            }
        ];

        sliders.forEach(config => {
            const control = new MIDIMappableSlider({
                ...config,
                midiManager: this.midiManager
            });
            
            this.addControl(control);
            
            control.setValue(config.initialValue);
            this.oscillator.setParameter(config.id, config.initialValue);
        });
    }

    addControl(control) {
        // Crea un container per il controllo
        const controlContainer = document.createElement('div');
        controlContainer.className = 'control-container';
        
        // Aggiungi il controllo al DOM
        const element = control.createElement();
        if (element) {
            controlContainer.appendChild(element);
            this.element.appendChild(controlContainer);
        }

        // Memorizza il controllo nella Map
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
        const waveformDiv = document.createElement('div');
        waveformDiv.className = 'control-group';
        const waveformSelect = document.createElement('select');
        
        // Map waveform values to numeric indices
        const waveforms = {
            'Sine': Oscillator.WAVEFORMS.SINE,
            'Square': Oscillator.WAVEFORMS.SQUARE,
            'Sawtooth': Oscillator.WAVEFORMS.SAWTOOTH,
            'Triangle': Oscillator.WAVEFORMS.TRIANGLE
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

        this.addLabel(waveformDiv, 'Waveform', waveformSelect);
        this.element.appendChild(waveformDiv);
    }

    createPlayControl() {
        const playButton = document.createElement('button');
        playButton.className = 'play-button';
        playButton.textContent = 'Play';
        
        playButton.addEventListener('click', async () => {
            try {
                // Resume the audio context directly
                if (this.audioEngine.audioContext.state === 'suspended') {
                    await this.audioEngine.audioContext.resume();
                }
                
                if (this.isPlaying) {
                    console.log('Stopping oscillator');
                    this.oscillator.stop();
                    playButton.textContent = 'Play';
                } else {
                    console.log('Starting oscillator');
                    this.oscillator.start();
                    playButton.textContent = 'Stop';
                }
                this.isPlaying = !this.isPlaying;
                console.log('Oscillator playing state:', this.isPlaying);
            } catch (err) {
                console.error('Error toggling oscillator:', err);
            }
        });
        
        this.element.appendChild(playButton);
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
}
