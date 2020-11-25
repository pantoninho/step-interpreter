const VM = require('context-eval');
const EventEmitter = require('./event-emitter');
const { prepare, toES2015 } = require('./code-transforms');
const { adaptError } = require('./error-adapters');
const { createContext } = require('./context');
const { createExecutionController } = require('./execution-controller');
const Stepper = require('./stepper');

const run = (code = '', options = {}) => {
    const {
        on = {},
        context: userContext = {},
        es2015 = false,
        destroyStepper = true,
        sync = false
    } = options;
    const events = EventEmitter();

    const stepper = new Stepper();
    const context = createContext({ events, userContext, stepper });
    const vm = new VM(context);

    const stepEventPipe = (data) => events.emit('step', data);
    const stepEventPipeDisposer = stepper.on('step', stepEventPipe);

    on.start && events.on('start', on.start);
    on.step && events.on('step', on.step);
    on.exit && events.on('end', on.exit);

    const { activeHandlers } = context._execution;
    activeHandlers.increment();
    activeHandlers.onEmptyPromise
        .then(() => events.emit('end'))
        .catch(() => events.emit('end'))
        .finally(() => {
            if (destroyStepper) {
                stepEventPipeDisposer();
                events.destroy();
                stepper.destroy();
                vm.destroy();
            }
        });

    const preparedCode = `
    __initialize__(this);
    ${es2015 ? toES2015(prepare(code, { sync })) : prepare(code, { sync })}
    `;

    events.emit('start');

    if (sync) {
        vm.evaluate(preparedCode)();
        activeHandlers.decrement();
        return;
    }

    const execution = vm
        .evaluate(preparedCode)()
        .catch((err) => {
            if (err === 'stepper-destroyed') {
                return;
            }

            // makes promises.onExecutionEnd fail aswell
            activeHandlers.reset(adaptError(err));
            throw adaptError(err);
        })
        .finally(() => {
            activeHandlers.decrement();
        });

    return createExecutionController({ execution, events, context });
};

exports.run = run;
