const sinon = require('sinon');
const { performance } = require('perf_hooks');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const Stepper = require('../src/stepper');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('stepper', function () {
    describe('setup', function () {
        it('should be able to be built without args', function () {
            const buildStepper = () => new Stepper();
            expect(buildStepper).to.not.throw();
        });
    });
    describe('stepping', function () {
        it('should be able to be destroyed', async function () {
            const stepper = new Stepper();

            stepper.destroy();
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
        });

        it('should not be able to step again after being destroyed', async function () {
            const stepper = new Stepper();

            stepper.destroy();

            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
        });

        it('should be able to be paused', async function () {
            const stepper = new Stepper();

            const pauseForMs = 100;

            // step is immediate
            stepper.pause();
            setTimeout(() => stepper.resume(), 110);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.greaterThan(pauseForMs);
        });

        it('should be able to call step with Infinity', async function () {
            const stepper = new Stepper();

            setTimeout(() => stepper.destroy(), 200);
            await expect(stepper.step(Infinity)).to.be.rejectedWith(
                'stepper-destroyed'
            );
        });

        it('should be able to call step with 0 and resolve immediately', async function () {
            const stepper = new Stepper();

            const before = performance.now();
            await expect(stepper.step(0)).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.lessThan(1);
        });

        it('should be able to call step with 100ms', async function () {
            const stepper = new Stepper();
            const threshold = 100;

            const before = performance.now();
            await expect(stepper.step(threshold + 10)).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.greaterThan(threshold);
        });

        it('should be able to be destroyed while paused', async function () {
            const stepper = new Stepper();

            // step is immediate
            stepper.pause();
            setTimeout(() => stepper.destroy(), 100);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
            const after = performance.now();

            expect(after - before).to.be.greaterThan(100);
        });

        it('pausing multiple times should have no effect', async function () {
            const stepper = new Stepper();

            // rename this variable
            const pauseAtMs = 10;
            const pauseForMs = 100;

            // step is immediate
            stepper.pause();
            setTimeout(() => stepper.pause(), pauseAtMs + 5);
            setTimeout(() => stepper.pause(), pauseAtMs + 10);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.greaterThan(pauseForMs);
        });

        it('resuming multiple times should have no effect', async function () {
            const stepper = new Stepper();

            // rename this variable
            const pauseAtMs = 10;
            const pauseForMs = 100;

            // step is immediate
            stepper.pause();
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs + 1);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs + 2);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.greaterThan(pauseForMs);
        });
    });

    describe('events', function () {
        it('should emit step event', async function () {
            const stepper = new Stepper();
            const callback = sinon.fake();
            stepper.on('step', callback);

            await stepper.step();
            expect(callback).to.have.been.called;
        });
    });
});
