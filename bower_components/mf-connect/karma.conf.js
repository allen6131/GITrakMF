// Karma configuration
// Generated on Tue Feb 28 2017 10:36:53 GMT-0500 (EST)
var istanbul = require('browserify-istanbul');
module.exports = function(config) {
    var aconfig = {

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine', 'browserify'],

        // list of files / patterns to load in the browser
        files: [
            'app-src/js/mf-connect-service.js',
            'app-src/js/mf-utils.js',
            'app-src/js/main.js',
            'node_modules/jquery/dist/jquery.js',
            'spec/tests/mfStubs.js',
            'spec/tests/*Spec.js'
        ],
        // list of files to exclude
        exclude: [
        ],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'app-src/js/main.js': ['browserify'],
            'app-src/js/mf-utils.js': ['browserify'],
            'app-src/js/mf-connect-service.js': ['browserify'],
            'spec/tests/*.js': ['browserify']
        },

        plugins: [
            'karma-browserify',
            'karma-jasmine',
            'karma-chrome-launcher',
            'karma-coverage'
        ],

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'coverage'],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity,

        // browserify with istanbul to show the coverage reports
        browserify: {
            debug: true,
            transform: [
                istanbul({
                    ignore: ['node_modules/**'],
                    instrumenterConfig: {
                        embedSource: true
                    }
                })
            ]
        }
    };


    function isSourceDebug(argument) {
        return argument === '--source-debug';
    }

    if (process.argv.some(isSourceDebug)) {
        console.log("Disable test coverage");
        delete aconfig["browserify"]["transform"];
        aconfig["reporters"] = aconfig["reporters"].slice(0, 1);
        aconfig["plugins"] = aconfig["plugins"].slice(0, 3);
    }
    config.set(aconfig);
};
