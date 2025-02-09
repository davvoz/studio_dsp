import Panel from '../components/Panel.js';

export default class MetronomePanel extends Panel {
    constructor(audioEngine) {
        super('metronome-panel', {
            title: 'Metronome',
            width: '200px',
            height: 'auto',
            draggable: true,
            collapsible: true
        });

        this.audioContext = audioEngine.audioContext;
        this.transport = audioEngine.getTransport();
        this.isEnabled = false;
        this.volume = 0.5;
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
    }

    create() {
        super.create();
        
        const content = this.element.querySelector('.panel-content');
        
        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'metronome-button';
        toggleBtn.textContent = '🔊';
        toggleBtn.onclick = () => {
            this.isEnabled = !this.isEnabled;
            toggleBtn.classList.toggle('active', this.isEnabled);
        };

        // Volume slider
        const volumeControl = document.createElement('div');
        volumeControl.className = 'volume-control';
        
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = 0;
        volumeSlider.max = 100;
        volumeSlider.value = this.volume * 100;
        volumeSlider.className = 'volume-slider';
        volumeSlider.oninput = (e) => {
            this.volume = e.target.value / 100;
            this.gainNode.gain.value = this.volume;
        };

        volumeControl.appendChild(volumeSlider);
        
        // Layout
        const controls = document.createElement('div');
        controls.className = 'metronome-controls';
        controls.appendChild(toggleBtn);
        controls.appendChild(volumeControl);
        content.appendChild(controls);

        // Transport listener
        this.transport.addListener({
            onTransportEvent: (event, beat) => {
                if (event === 'beat' && this.isEnabled) {
                    this.playClick(beat);
                }
            }
        });

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .metronome-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
            }
            .metronome-button {
                width: 40px;
                height: 40px;
                border-radius: 4px;
                border: 1px solid #666;
                background: #333;
                color: #fff;
                cursor: pointer;
            }
            .metronome-button.active {
                background: #0af;
            }
            .volume-control {
                flex: 1;
            }
            .volume-slider {
                width: 100%;
            }
        `;
        document.head.appendChild(style);
    }

    playClick(beat) {
        const osc = this.audioContext.createOscillator();
        const clickGain = this.audioContext.createGain();
        
        // Imposta frequenza più alta per il primo beat di ogni battuta
        osc.frequency.value = beat % 4 === 0 ? 1000 : 800;
        
        clickGain.gain.value = this.volume;
        clickGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
        
        osc.connect(clickGain);
        clickGain.connect(this.gainNode);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    dispose() {
        this.gainNode.disconnect();
        super.dispose();
    }
}
