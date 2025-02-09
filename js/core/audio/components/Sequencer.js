import AbstractDSPProcessor from '../processes/AbstractDSPProcessor.js';

export default class Sequencer extends AbstractDSPProcessor {
    static DEFAULT_STEPS = 16;

    constructor(audioContext, id) {
        super(audioContext, id);
        this.currentStep = 0;
        this.steps = Sequencer.DEFAULT_STEPS;
        this.activeSteps = new Array(this.steps).fill(false);
        this.targets = new Set();
        this.transport = null;
    }

    setTransport(transport) {
        if (this.transport) {
            this.transport.removeListener(this);
        }
        
        this.transport = transport;
        
        const transportListener = {
            onTransportEvent: (event, data) => {
                if (event === 'beat' && data) {
                    const stepIndex = data.index % this.steps;
                    const isActive = this.activeSteps[stepIndex];
                    
                    console.log(`Sequencer beat - step: ${stepIndex}, active: ${isActive}, time: ${data.time}`);
                    
                    // Notifica tutti i target
                    this.targets.forEach(target => {
                        target.trigger(data.time, {
                            stepIndex,
                            active: isActive,
                            beatTime: data.time
                        });
                    });
                } else if (event === 'stop') {
                    const stopTime = data.time || this.audioContext.currentTime;
                    console.log('Sequencer: Stopping all targets at time:', stopTime);
                    
                    // Gestisci gli errori per ogni target
                    this.targets.forEach(target => {
                        try {
                            target.trigger(stopTime, { active: false });
                        } catch (error) {
                            console.warn('Error stopping target:', error);
                        }
                    });
                }
            }
        };

        this.transport.addListener(transportListener);
        console.log('Sequencer connected to transport');
    }

    toggleStep(step) {
        if (step >= 0 && step < this.steps) {
            this.activeSteps[step] = !this.activeSteps[step];
            console.log(`Step ${step} toggled: ${this.activeSteps[step]}`);
            return this.activeSteps[step];
        }
        return false;
    }

    addTarget(target) {
        if (typeof target.trigger === 'function') {
            this.targets.add(target);
        }
    }

    removeTarget(target) {
        this.targets.delete(target);
    }

    dispose() {
        if (this.transport) {
            this.transport.removeListener(this);
        }
        this.targets.clear();
        super.dispose();
    }
}
