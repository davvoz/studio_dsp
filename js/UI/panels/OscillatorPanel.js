import Oscillator from '../../core/audio/components/Oscillator.js';
import Panel from '../components/Panel.js';

class OscillatorPanel extends Panel {
    constructor(audioEngine) {
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
        
        this.audioEngine = audioEngine;
        this.oscillator = new Oscillator(this.audioEngine.audioContext, 'osc1');
        this.isPlaying = false;
    }

    create() {
        super.create();
        const content = document.createElement('div');
        
        this.element.classList.add('oscillator-panel');
        
        // Create waveform selector
        this.createWaveformSelector();

        // Create sliders
        const sliders = [
            {
                id: 'frequency',
                min: 20,
                max: 2000,
                step: 0.1,
                value: 440,
                label: 'Frequency (Hz)',
                onChange: (value) => this.oscillator.setParameter('frequency', value)
            },
            {
                id: 'detune',
                min: -1200,
                max: 1200,
                step: 1,
                value: 0,
                label: 'Detune (cents)',
                onChange: (value) => this.oscillator.setParameter('detune', value)
            },
            {
                id: 'pan',
                min: -1,
                max: 1,
                step: 0.01,
                value: 0,
                label: 'Pan',
                onChange: (value) => this.oscillator.setParameter('pan', value)
            },
            {
                id: 'mix',
                min: 0,
                max: 1,
                step: 0.01,
                value: 1,
                label: 'Mix',
                onChange: (value) => this.oscillator.setParameter('mix', value)
            }
        ];

        sliders.map(config => this.createSlider(config))
            .forEach(control => this.element.appendChild(control));

        this.createPlayControl();
        this.audioEngine.registerComponent(this.oscillator);
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
                    await this.oscillator.stop();
                    playButton.textContent = 'Play';
                } else {
                    console.log('Starting oscillator');
                    await this.oscillator.start();
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

    createSlider({ id, min, max, step, value, label, onChange }) {
        const container = document.createElement('div');
        container.className = 'control-group';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = value;

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = value;
            onChange(value);
        });

        this.addLabel(container, label, slider);
        container.appendChild(valueDisplay);

        return container;
    }

    addLabel(container, text, element) {
        const label = document.createElement('label');
        label.textContent = text;
        container.appendChild(label);
        container.appendChild(element);
        return container;
    }

    dispose() {
        this.audioEngine.unregisterComponent(this.oscillator.id);
        super.dispose();
    }
}

export default OscillatorPanel;
