const path = require('path')

module.exports = {
    devtool: 'eval-source-map',

    entry: `${__dirname}/app/index.js`,
    output: {
        filename: 'app.bundle.js',
        path: `${__dirname}/dist`,
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['env', 'react']
                }
            }
        }]
    }
}