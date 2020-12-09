const Babel = require('@babel/standalone');

exports.toES2015 = toES2015;
exports.prepare = prepare;

function toES2015(code) {
    return Babel.transform(code, {
        presets: ['env'],
        sourceType: 'script'
    }).code;
}

function prepare(code, { sync = false } = {}) {
    if (sync) {
        return `
function main() {
    ${code}
}
        
main;
        `;
    }

    return `
async function main() {
    ${
        Babel.transform(code, {
            plugins: [stepInjector],
            parserOpts: {
                allowAwaitOutsideFunction: true
            },
            sourceType: 'script'
        }).code
    }
}

main;
`;
}

function stepInjector(babel) {
    const t = babel.types;

    return {
        visitor: {
            Function(path) {
                path.node.async = true;
            },
            ArrowFunctionExpression(path) {
                path.node.async = true;
                implicitToExplicitReturnFunction(babel, path);
            },
            ReturnStatement(path) {
                prependContextCall(babel, path);

                if (!t.isAwaitExpression(path.node.argument)) {
                    path.node.argument = t.awaitExpression(path.node.argument);
                }
            },
            Loop(path) {
                prependContextCall(babel, path);

                if (
                    t.isBlockStatement(path.node.body) &&
                    !path.node.body.body.length
                ) {
                    path.node.body = t.blockStatement([
                        createContextCall(
                            babel,
                            'step'
                        )
                    ]);
                    path.skip();
                }
            },
            VariableDeclaration(path) {
                if (
                    t.isForStatement(path.parent) ||
                    t.isWhileStatement(path.parent)
                ) {
                    path.skip();
                    return;
                }

                prependContextCall(babel, path);
            },
            CallExpression(path) {
                if (t.isAwaitExpression(path.parent)) {
                    return;
                }

                path.node.arguments = path.node.arguments.map((arg) => {
                    if (t.isCallExpression(arg)) {
                        return t.awaitExpression(arg);
                    }
                    return arg;
                });

                path.replaceWith(t.awaitExpression(path.node));
            },
            ExpressionStatement(path) {
                if (
                    t.isAwaitExpression(path.node.expression) &&
                    t.isCallExpression(path.node.expression.argument) &&
                    path.node.expression.argument.callee.name === 'step'
                ) {
                    path.skip();
                    return;
                }

                prependContextCall(babel, path);
            }
        }
    };
}

function createContextCall(babel, fnName) {
    const { types: t } = babel;

    const stepperName = t.identifier(fnName);

    return t.expressionStatement(
        t.awaitExpression(t.callExpression(stepperName, []))
    );
}

function prependContextCall(babel, path) {
    return path.insertBefore(
        createContextCall(babel, 'step')
    );
}

function implicitToExplicitReturnFunction(babel, path) {
    const { types: t } = babel;

    if (t.isBlockStatement(path.node.body)) {
        return;
    }

    const { params } = path.node;

    const stepCall = createContextCall(
        babel,
        'step'
    );
    const returnStatement = t.returnStatement(path.node.body);
    const body = t.blockStatement([stepCall, returnStatement]);
    const { async: isAsync } = path.node;

    path.replaceWith(t.arrowFunctionExpression(params, body, isAsync));
    path.skip();
}
