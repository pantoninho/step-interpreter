module.exports = {
    env: {
        es6: true,
        node: true,
        mocha: true
    },
    plugins: ['mocha'],
    extends: [
        'eslint:recommended',
        'plugin:mocha/recommended',
        'plugin:prettier/recommended'
    ],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
    },
    parserOptions: {
        ecmaVersion: 2018,
    },
    rules: {}
};
