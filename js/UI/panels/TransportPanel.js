import Panel from '../components/Panel.js';

export default class TransportPanel extends Panel {
    constructor(audioEngine) {
        super('transport-panel', {
            title: 'Transport',
            width: '300px',
            height: 'auto',
            draggable: true,
            collapsible: true
        });

        this.audioEngine = audioEngine;
        this.transport = audioEngine.getTransport();
        this.beatDisplay = null;
    }

    create() {
        super.create();
        
        const content = this.element.querySelector('.panel-content');
        content.classList.add('transport-panel-content');

        // Create main controls container
        const controls = document.createElement('div');
        controls.className = 'transport-controls';

        // Create transport buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'transport-buttons';

        const playButton = document.createElement('button');
        playButton.className = 'transport-button play';
        playButton.innerHTML = '▶';
        playButton.onclick = () => this.togglePlay();

        const stopButton = document.createElement('button');
        stopButton.className = 'transport-button stop';
        stopButton.innerHTML = '⬛';
        stopButton.onclick = () => this.transport.stop();

        // Create tempo controls
        const tempoContainer = document.createElement('div');
        tempoContainer.className = 'tempo-container';

        const tempoLabel = document.createElement('label');
        tempoLabel.textContent = 'BPM';

        const tempoInput = document.createElement('input');
        tempoInput.type = 'number';
        tempoInput.value = this.transport.tempo;
        tempoInput.min = 30;
        tempoInput.max = 300;
        tempoInput.className = 'tempo-input';
        tempoInput.onchange = (e) => this.transport.setTempo(parseFloat(e.target.value));

        // Create beat display
        this.beatDisplay = document.createElement('div');
        this.beatDisplay.className = 'beat-display';
        this.beatDisplay.textContent = '1.1.1';

        // Assemble the panel
        buttonContainer.appendChild(playButton);
        buttonContainer.appendChild(stopButton);
        
        tempoContainer.appendChild(tempoLabel);
        tempoContainer.appendChild(tempoInput);

        controls.appendChild(buttonContainer);
        controls.appendChild(tempoContainer);
        controls.appendChild(this.beatDisplay);
        
        content.appendChild(controls);

        // Listen for transport events
        this.transport.addListener({
            onTransportEvent: (event, data) => {
                //console.log('TransportPanel: Received event:', event, 'with data:', data); // Debug log
                switch(event) {
                    case 'beat':
                        this.updateBeatDisplay(data);
                        break;
                    case 'start':
                        console.log('TransportPanel: Activating play button'); // Debug log
                        playButton.classList.add('active');
                        break;
                    case 'stop':
                        console.log('TransportPanel: Deactivating play button'); // Debug log
                        playButton.classList.remove('active');
                        this.beatDisplay.textContent = '1.1.1';
                        break;
                }
            }
        });
    }

    togglePlay() {
        console.log('TransportPanel: Toggle play, current state:', this.transport.isPlaying); // Debug log
        if (this.transport.isPlaying) {
            this.transport.stop();
        } else {
            this.transport.start();
        }
        console.log('TransportPanel: New state:', this.transport.isPlaying); // Debug log
    }

    updateBeatDisplay(beat) {
        if (!beat || typeof beat.index === 'undefined') return;
        
        const bar = Math.floor(beat.index / 16) + 1;
        const beatInBar = Math.floor((beat.index % 16) / 4) + 1;
        const sixteenth = (beat.index % 4) + 1;
        
        this.beatDisplay.textContent = `${bar}.${beatInBar}.${sixteenth}`;
        
        // Add animation
        this.beatDisplay.classList.remove('pulse');
        void this.beatDisplay.offsetWidth; // Trigger reflow
        this.beatDisplay.classList.add('pulse');
    }

    dispose() {
        // Transport cleanup will be handled by AudioEngine
        super.dispose();
    }
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
.transport-panel-content {
    padding: 10px;
}

.transport-controls {
    display: flex;
    align-items: center;
    gap: 15px;
}

.transport-buttons {
    display: flex;
    gap: 5px;
}

.transport-button {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    border: 1px solid #666;
    background: #333;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.transport-button.active {
    background: #0af;
}

.tempo-container {
    display: flex;
    align-items: center;
    gap: 5px;
}

.tempo-input {
    width: 60px;
    height: 30px;
    text-align: center;
    background: #333;
    border: 1px solid #666;
    color: #fff;
    border-radius: 4px;
}

.beat-display {
    font-family: monospace;
    font-size: 16px;
    background: #222;
    padding: 5px 10px;
    border-radius: 4px;
    min-width: 70px;
    text-align: center;
    transition: transform 0.05s ease-out;
}

.beat-display.pulse {
    animation: beatPulse 0.1s ease-out;
}

@keyframes beatPulse {
    0% {
        transform: scale(1);
        background: #333;
    }
    50% {
        transform: scale(1.1);
        background: #444;
    }
    100% {
        transform: scale(1);
        background: #222;
    }
}
`;
document.head.appendChild(style);
