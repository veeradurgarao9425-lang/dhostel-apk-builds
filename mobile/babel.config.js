module.exports = function (api) {
    api.cache(true);

    // Strip all console.* calls from production builds (keeps console.error for
    // crash visibility). Dev builds keep logs for debugging.
    const isProduction = process.env.BABEL_ENV === 'production' || process.env.NODE_ENV === 'production';

    const plugins = [
        ['babel-plugin-transform-import-meta', { module: 'ES6' }],
    ];

    if (isProduction) {
        plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
    }

    return {
        presets: ['babel-preset-expo'],
        plugins,
        overrides: [
            {
                test: /[\\/]node_modules[\\/]react-native-toast-message[\\/]/,
                presets: ['babel-preset-expo']
            }
        ]
    };
};
