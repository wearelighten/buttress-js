'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const clean = require('gulp-clean');
const bump = require('gulp-bump');
const cache = require('gulp-cached');

const Paths = {
  SOURCE: 'app/server',
  DEST: 'deploy',
  EMAIL_DEST: 'deploy/email'
};

const Sources = {
  JS: [`${Paths.SOURCE}/*.js`, `${Paths.SOURCE}/**/*.js`],
  JSON: [`${Paths.SOURCE}/*.json`, `${Paths.SOURCE}/**/*.json`],
  PUG: [`${Paths.SOURCE}/*.pug`, `${Paths.SOURCE}/**/*.pug`],
  EMAIL_LESS: [`${Paths.SOURCE}/email/**/*.less`],
  EMAIL_PUG: [`${Paths.SOURCE}/email/**/*.pug`]
};

// Scripts
gulp.task('js', function() {
  return gulp.src(Sources.JS, { base: Paths.SOURCE })
    .pipe(cache('js'))
    .pipe(eslint())
    .pipe(eslint.format())
    // .pipe(eslint.failAfterError())
    .pipe(gulp.dest(Paths.DEST));
});
gulp.task('scripts', function() {
  return gulp.start('js');
});

// Email
gulp.task('email-styles', function() {
  return gulp.src(Sources.EMAIL_LESS, { base: Paths.SOURCE })
    .pipe(gulp.dest(Paths.EMAIL_DEST));
});
gulp.task('styles', function() {
  return gulp.start('email-styles');
});
gulp.task('views-email', function() {
  return gulp.src(Sources.EMAIL_PUG, { base: 'app/server/email' })
    .pipe(gulp.dest(Paths.EMAIL_DEST));
});
gulp.task('views', function() {
  return gulp.start('views-email');
});

// Statics
gulp.task('json', function() {
  return gulp.src(Sources.JSON, { base: Paths.SOURCE })
    .pipe(gulp.dest(Paths.DEST));
});

gulp.task('resources', function() {
  return gulp.start(['json']);
});

// Commands
gulp.task('watch', ['build'], function() {
  // Watch Styles
  gulp.watch(Sources.EMAIL_LESS, ['styles']);
  gulp.watch(Sources.EMAIL_PUG, ['views']);
  // Watch Scripts
  gulp.watch(Sources.JS, ['js']);
  // Watch Resources
  gulp.watch(Sources.JSON, ['resources']);
});

gulp.task('clean', function() {
  return gulp.src([`${Paths.DEST}/*`], {read: false})
    .pipe(clean());
});

gulp.task('build', ['clean'], function() {
  return gulp.start('scripts', 'styles', 'views', 'resources');
});

gulp.task('bump-major', function() {
  return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
    .pipe(bump({type: 'major'}))
    .pipe(gulp.dest('./'));
});
gulp.task('bump-minor', function() {
  return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
    .pipe(bump({type: 'minor'}))
    .pipe(gulp.dest('./'));
});
gulp.task('bump-patch', function() {
  return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
    .pipe(bump({type: 'patch'}))
    .pipe(gulp.dest('./'));
});
gulp.task('bump-prerelease', function() {
  return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
    .pipe(bump({type: 'prerelease'}))
    .pipe(gulp.dest('./'));
});
