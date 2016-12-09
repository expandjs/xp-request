// Const
const webpack = require('webpack');

// Exporting
module.exports = {
    entry: './index.js',
    externals: {
        'expandjs': 'XP',
        'http': 'http',
        'https': 'https',
        'xp-buffer': 'XPBuffer',
        'xp-emitter': 'XPEmitter'
    },
    output: {
        filename: 'xp-request.js',
        path: './dist'
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({compress: {warnings: false}, output: {comments: false}})
    ]
};
