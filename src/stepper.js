const EventEmitter = require('./event-emitter');

class Stepper {
    constructor() {
        this.events = EventEmitter();
    }

    async step(ms = false) {
        if (this.destroyed) {
            throw 'stepper-destroyed';
        }

        this.events.emit('step');

        if (!this.paused && ms === false) {
            return;
        }

        this.currentStep = wait(ms);

        try {
            await this.currentStep;
        } catch (err) {
            throw 'stepper-destroyed';
        }
    }

    pause() {
        if (this.paused) {
            return;
        }

        this.paused = true;
    }

    resume() {
        if (!this.paused) {
            return;
        }

        this.paused = false;
        if (this.currentStep) {
            this.currentStep.resolve();
        }
    }

    on(event, handler) {
        return this.events.on(event, handler);
    }

    off(event, handler) {
        return this.events.off(event, handler);
    }

    once(event, handler) {
        return this.events.once(event, handler);
    }

    async destroy() {
        this.events.destroy();
        this.destroyed = true;
        this.paused = false;

        if (this.currentStep) {
            this.currentStep.cancel();
        }
    }
}

module.exports = Stepper;

function wait(ms = false) {
    let rejector;
    let resolver;

    const promise = new Promise((resolve, reject) => {
        rejector = reject;
        resolver = resolve;

        if (ms !== false) {
            setTimeout(() => promise.resolve(), ms);
        }
    });

    const destroy = () => {
        rejector = null;
        resolver = null;
    };
    promise.cancel = () => {
        if (rejector) {
            rejector('destroyed');
        }
        destroy();
    };
    promise.resolve = () => {
        if (resolver) {
            resolver();
        }
        destroy();
    };

    return promise;
}
