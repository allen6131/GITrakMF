/*jshint node:true, latedef:nofunc*/
'use strict';

// Gulp dependencies
var gulp = require('gulp');
var rename = require('gulp-rename');
var del = require('del');

// Build dependencies
var browserify = require('gulp-browserify');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var transform = require('vinyl-transform');
var through2 = require('through2');
var buffer = require('vinyl-buffer');

// Style dependencies
var less = require('gulp-less');
//var prefix = require('gulp-autoprefixer');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');
var browsersync = require('browser-sync').create();

// Development dependencies
var jshint = require('gulp-jshint');

// Test dependencies
var mochaPhantomjs = require('gulp-mocha-phantomjs');

var $ = require('gulp-load-plugins')({ lazy: true });

gulp.task('lint', function() {
	return gulp.src('./app-src/**/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('lint-test', function() {
	return gulp.src('./test/**/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('test', ['lint-test'], function() {
    return gulp.src('test/client/index.html')
        .pipe(mochaPhantomjs());
});

/**
 * browserify-client, broserify, and broserify-test don't do anything
 * we have to manually browserify because never got these to work :(
 */
gulp.task('browserify-client', ['lint-client'], function() {
	return gulp.src('./app-src/main.js')
		.pipe(browserify({
			insertGlobals: true
		}))
		.pipe(rename('bundle.js'))
		.pipe(gulp.dest('build'))
		.pipe(gulp.dest('public/js'));
});

gulp.task('browserify', function() {
	var browserified = transform(function(filename) {
		var b = browserify(filename);
		return b.bundle();
	});

	return gulp.src(['./app-src/main.js'])
		.pipe(browserified)
		.pipe(uglify())
		.pipe(gulp.dest('public/js'));
});

gulp.task('browserify-test', ['lint-test'], function() {
	return gulp.src('test/app-src/index.js')
		.pipe(browserify({
			insertGlobals: true
		}))
		.pipe(rename('client-test.js'))
		.pipe(gulp.dest('build'));
});

gulp.task('serve', ['build', 'watch'], function() {
	browsersync.init({
		server: {
			baseDir: ['app-src', 'public']
		},
		port: 8000
	});
});

gulp.task('watch', function() {
	gulp.watch('app-src/**/*.js', ['test']);
	gulp.watch('app-src/scss/*.scss');
	gulp.watch('test/app-src/**/*.js', ['test']);
});

gulp.task('styles', ['clean-styles'], function() {

	return gulp
		.src('./app-src/scss/main.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(rename('mf-connect.css'))
		.pipe(gulp.dest('./build'))
		.pipe(gulp.dest('./public/styles'));
});

gulp.task('clean-styles', function(done) {

	var files = [].concat(
		'./build/*.css',
		'./public/styles/*.css'
	);
	clean(files, done);
});

gulp.task('minify', ['styles'], function() {
	return gulp.src('./build/mf-connect.css')
		.pipe(cleanCSS())
		.pipe(rename('mf-connect.min.css'))
		.pipe(gulp.dest('./public/styles'));
});

gulp.task('uglify', function() {
    log('Uglifying mf-connect.js and renaming it to mf-connect.min.js');

	return gulp.src('./public/js/mf-connect.js')
		.pipe(uglify())
		.pipe(rename('mf-connect.min.js'))
		.pipe(gulp.dest('./public/js'));
});

/**
 * Delete all files in a given path
 * @param  {Array}   path - array of paths to delete
 * @param  {Function} done - callback when complete
 */
function clean(path, done) {
	del(path).then(function() {
		done();
	});
}

/**
 * Log a message or series of messages using chalk's blue color.
 * Can pass in a string, object or array.
 */
function log(msg) {
	if (typeof(msg) === 'object') {
		for (var item in msg) {
			if (msg.hasOwnProperty(item)) {
				$.util.log($.util.colors.blue(msg[item]));
			}
		}
	} else {
		$.util.log($.util.colors.blue(msg));
	}
}

gulp.task('build', ['uglify', 'minify']);

gulp.task('default', ['lint', 'test', 'build', 'watch']);

module.exports = gulp;
