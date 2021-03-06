const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: `${__dirname}/app/index.js`,
    output: {
        path: `${__dirname}/dist`,
        filename: 'js/app.bundle.js',
    },

    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['env', 'react'],
                    plugins: ['transform-class-properties'],
                }
            }
        }]
    },

    plugins: [
        new HtmlWebpackPlugin({
            inject: false,
            template: require('html-webpack-template'),
            title: 'My10086',
            appMountId: 'root',
        }),
    ],

    devtool: 'eval-source-map',
    devServer: {
        contentBase: './dist',
    },
}