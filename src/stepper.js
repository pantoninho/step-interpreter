const EventEmitter = require('./event-emitter');

class Stepper {
    constructor() {
        this.events = EventEmitter();
    }

    async step(ms) {
        if (this.destroyed) {
            throw 'stepper-destroyed';
        }

        this.events.emit('step');
        this.currentStep = wait(ms);

        try {
            await this.currentStep;

            if (this.pausePromise) {
                await this.pausePromise;
            }
        } catch (err) {
            throw 'stepper-destroyed';
        }
    }

    async pause() {
        if (this.pausePromise) {
            return;
        }

        this.pausePromise = wait(Infinity);
    }

    async resume() {
        if (!this.pausePromise) {
            return;
        }

        this.pausePromise.resolve();
        this.pausePromise = null;
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

        if (this.currentStep) {
            this.currentStep.cancel();
        }

        if (this.pausePromise) {
            this.pausePromise.cancel();
        }
    }
}

module.exports = Stepper;

function wait(ms) {
    if (!ms) {
        return;
    }

    let rejector;
    let resolver;

    const promise = new Promise((resolve, reject) => {
        rejector = reject;
        resolver = resolve;

        if (ms !== Infinity) {
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
