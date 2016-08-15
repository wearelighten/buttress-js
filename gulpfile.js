//
// Includes
//

var gulp = require('gulp');
var coffee = require('gulp-coffee');
var eslint = require('gulp-eslint');
var clean = require('gulp-clean');

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
  gulp.start('scripts', 'resources');

  // Watch Scripts
  gulp.watch(['app/**/*.coffee'], ['coffee']);
  gulp.watch(['app/server/**/*.js'], ['js']);
  // Watch Resources
  gulp.watch('app/server/nodemon.json', ['nodemon']);
});

gulp.task('clean', function() {
  return gulp.src(['deploy/*'], {read: false})
  .pipe(clean());
});

gulp.task('build', ['clean'], function() {
  return gulp.start('scripts', 'resources');
});
