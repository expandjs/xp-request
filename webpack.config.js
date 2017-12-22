// Const
const Uglify = require('uglifyjs-webpack-plugin');

// Exporting
module.exports = {
    entry: './index.js',
    output: {filename: 'xp-request.js', path: `${__dirname}/dist`},
    plugins: [new Uglify({uglifyOptions: {output: {comments: /^$/}}})],
    externals: {
        'expandjs': 'XP',
        'http': 'http',
        'https': 'https',
        'xp-buffer': 'XPBuffer',
        'xp-emitter': 'XPEmitter'
    }
};
