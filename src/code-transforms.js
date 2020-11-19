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
        return `
${sync ? '' : 'async '}function main() {
    ${code}
}

main;
`;
}
