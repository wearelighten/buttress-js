//
// Includes
//

const gulp = require('gulp');
const coffee = require('gulp-coffee');
const eslint = require('gulp-eslint');
const clean = require('gulp-clean');
const bump = require('gulp-bump');

//
// Scripts
//

gulp.task('coffee', function() {
  return gulp.src(['app/server/**/*.coffee'])
    .pipe(coffee())
    .pipe(gulp.dest('deploy'));
});

gulp.task('js', function() {
  return gulp.src('app/server/**/*.js')
		.pipe(eslint())
		.pipe(eslint.format())
		// .pipe(eslint.failAfterError())
		.pipe(gulp.dest('deploy'));
});

gulp.task('scripts', function() {
  return gulp.start(['coffee', 'js']);
});

/**
 * STYLES
 */
gulp.task('email-styles', function() {
  return gulp.src(['app/server/email/**/*.less'])
    .pipe(gulp.dest('deploy/email'));
});
gulp.task('styles', function() {
  return gulp.start('email-styles');
});

/**
 * STYLES
 */
gulp.task('views-email', function() {
  return gulp.src(['app/server/email/**/*.pug'], {base: 'app/server/email'})
    .pipe(gulp.dest('deploy/email'));
});

gulp.task('views', function() {
  return gulp.start('views-email');
});

//
// Static resources
//

gulp.task('mongroup', function() {
  return gulp.src('app/server/mongroup.*')
    .pipe(gulp.dest('deploy'));
});
gulp.task('json', function() {
  return gulp.src('app/server/*.json')
    .pipe(gulp.dest('deploy'));
});

gulp.task('resources', function() {
  return gulp.start(['mongroup', 'json']);
});

//
// Commands
//

gulp.task('watch', ['clean'], function() {
  gulp.start('scripts', 'styles', 'views', 'resources');

  // Watch Views
  gulp.watch(['app/server/**/*.pug'], ['views']);

  // Watch Styles
  gulp.watch(['app/server/**/*.less'], ['styles']);
  // Watch Scripts
  gulp.watch(['app/**/*.coffee'], ['coffee']);
  gulp.watch(['app/server/**/*.js'], ['js']);
  // Watch Resources
  gulp.watch('app/server/**/*.json', ['resources']);
});

gulp.task('clean', function() {
  return gulp.src(['deploy/*'], {read: false})
  .pipe(clean());
});

gulp.task('build', ['clean'], function() {
  return gulp.start('scripts', 'styles', 'views', 'resources');
});

gulp.task('bump-major', function() {
  return gulp.src(['./bower.json', './package.json', './README.md', 'app/server/config.json'])
    .pipe(bump({type: 'major'}))
    .pipe(gulp.dest('./'));
});

gulp.task('bump-minor', function() {
  return gulp.src(['./bower.json', './package.json', './README.md', 'app/server/config.json'])
    .pipe(bump({type: 'minor'}))
    .pipe(gulp.dest('./'));
});

gulp.task('bump-patch', function() {
  return gulp.src(['./bower.json', './package.json', './README.md', 'app/server/config.json'])
    .pipe(bump({type: 'patch'}))
    .pipe(gulp.dest('./'));
});

gulp.task('bump-prerelease', function() {
  return gulp.src(['./bower.json', './package.json', './README.md', 'app/server/config.json'])
    .pipe(bump({type: 'prerelease'}))
    .pipe(gulp.dest('./'));
});

