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
        if (!transport) {
            console.error('No transport provided to sequencer');
            return;
        }

        if (this.transportListener) {
            this.transport?.removeListener(this.transportListener);
        }
        
        this.transport = transport;
        
        // Crea un nuovo listener dedicato
        this.transportListener = {
            onTransportEvent: (event, data) => {
                console.log('Sequencer received transport event:', event, data);
                
                switch(event) {
                    case 'beat':
                        if (!data) return;
                        const stepIndex = data.index % this.steps;
                        const isActive = this.activeSteps[stepIndex];
                        
                        console.log(`Sequencer processing beat ${stepIndex}, active: ${isActive}`);
                        
                        this.targets.forEach(target => {
                            target.trigger(data.time, {
                                stepIndex,
                                active: isActive,
                                beatTime: data.time,
                                beatDuration: data.beatDuration
                            });
                        });
                        break;

                    case 'start':
                        console.log('Sequencer received start event');
                        this.currentStep = 0;
                        break;

                    case 'stop':
                        console.log('Sequencer received stop event');
                        const stopTime = data?.time || this.audioContext.currentTime;
                        this.targets.forEach(target => {
                            target.trigger(stopTime, { 
                                active: false,
                                stopAll: true 
                            });
                        });
                        break;
                }
            }
        };

        this.transport.addListener(this.transportListener);
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
