import Panel from '../components/Panel.js';
import Sequencer from '../../core/audio/components/Sequencer.js';

export default class SequencerPanel extends Panel {
    constructor(audioEngine) {
        super('sequencer-panel', {
            title: 'Step Sequencer',
            width: '600px',
            height: 'auto',
            draggable: true,
            collapsible: true
        });

        this.audioEngine = audioEngine;
        this.audioContext = audioEngine.audioContext;  // Add this line
        this.sequencer = new Sequencer(audioEngine.audioContext, 'main-sequencer');
        this.sequencer.setTransport(audioEngine.getTransport());
        this.buttons = [];
        this.connectedOscillator = null;
        this.stepDuration = 0.1; // 100ms default
    }

    create() {
        super.create();
        
        const content = this.element.querySelector('.panel-content');
        const controls = document.createElement('div');
        controls.className = 'sequencer-controls';
        
        // Create grid container
        const grid = document.createElement('div');
        grid.className = 'step-grid';
        
        // Create step buttons
        for (let i = 0; i < this.sequencer.steps; i++) {
            const button = document.createElement('button');
            button.className = 'step-button';
            button.onclick = () => {
                const active = this.sequencer.toggleStep(i);
                button.classList.toggle('active', active);
            };
            grid.appendChild(button);
            this.buttons.push(button);
        }
        
        controls.appendChild(grid);
        content.appendChild(controls);

        // Add step duration control
        const durationControl = document.createElement('div');
        durationControl.className = 'duration-control';
        
        const durationLabel = document.createElement('label');
        durationLabel.textContent = 'Duration (ms)';
        
        const durationInput = document.createElement('input');
        durationInput.type = 'number';
        durationInput.min = 10;
        durationInput.max = 1000;
        durationInput.value = this.stepDuration * 1000;
        durationInput.onchange = (e) => {
            this.stepDuration = e.target.value / 1000;
        };

        durationControl.appendChild(durationLabel);
        durationControl.appendChild(durationInput);
        controls.appendChild(durationControl);

        // Listen to transport for current step highlight
        this.audioEngine.getTransport().addListener({
            onTransportEvent: (event, data) => {
                if (event === 'beat' && data) {
                    // Remove highlight from all buttons
                    this.buttons.forEach(btn => btn.classList.remove('current'));
                    // Add highlight to current step
                    const currentStep = data.index % this.sequencer.steps;
                    this.buttons[currentStep]?.classList.add('current');
                } else if (event === 'stop') {
                    // Remove all current step highlights
                    this.buttons.forEach(btn => btn.classList.remove('current'));
                }
            }
        });
    }

    connectToOscillator(oscillatorPanel) {
        this.connectedOscillator = oscillatorPanel;
        oscillatorPanel.setConnected(true);
        
        const target = {
            trigger: (time, stepInfo) => {
                if (!this.connectedOscillator) return;
                
                const osc = this.connectedOscillator.getOscillator();
                if (!osc) return;

                try {
                    // Se riceviamo un evento di stop, fermiamo tutto
                    if (stepInfo.stopAll) {
                        osc.stop(time);
                        return;
                    }

                    // Ferma sempre la nota precedente
                    osc.stop(time);

                    // Suona solo se lo step è attivo
                    if (stepInfo.active) {
                        const freq = this.connectedOscillator.getFrequency();
                        // Usa la durata del beat se disponibile, altrimenti usa stepDuration
                        const duration = Math.min(
                            stepInfo.beatDuration || this.stepDuration,
                            this.stepDuration
                        );
                        
                        console.log(`Triggering note at ${time} for ${duration}s`);
                        
                        osc.setFrequency(freq, time);
                        osc.start(time);
                        // Programma lo stop della nota
                        osc.stop(time + duration);
                        
                        this.triggerVisualFeedback(this.connectedOscillator);
                    }
                } catch (error) {
                    console.error('Error in sequencer trigger:', error);
                }
            }
        };

        this.sequencer.addTarget(target);
        console.log('Connected oscillator to sequencer:', this.connectedOscillator.id);

        // Aggiungi indicatore di connessione al sequencer
        const connectionLabel = document.createElement('div');
        connectionLabel.className = 'connection-label';
        connectionLabel.textContent = `⚡ Connected to ${oscillatorPanel.id}`;
        this.element.querySelector('.panel-content').appendChild(connectionLabel);
    }

    triggerVisualFeedback(oscillatorPanel) {
        const panel = oscillatorPanel.element;
        panel.classList.add('triggered');
        setTimeout(() => panel.classList.remove('triggered'), 100);
    }

    dispose() {
        this.sequencer.dispose();
        super.dispose();
    }
}
