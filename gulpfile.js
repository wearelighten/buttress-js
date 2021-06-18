'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const gulpClean = require('gulp-clean');

const Paths = {
	SOURCE: 'src',
	DEST: 'deploy',
	EMAIL_DEST: 'deploy/email',
};

const Sources = {
	JS: [`${Paths.SOURCE}/*.js`, `${Paths.SOURCE}/**/*.js`],
	JSON: [`${Paths.SOURCE}/*.json`, `${Paths.SOURCE}/**/*.json`],
	HTML: [`${Paths.SOURCE}/*.html`, `${Paths.SOURCE}/**/*.html`],
};

// Scripts
const js = () => {
	return gulp.src(Sources.JS, {base: Paths.SOURCE})
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(gulp.dest(Paths.DEST));
};
const jsSrcFix = () => {
	return gulp.src(Sources.JS, {base: Paths.SOURCE})
		.pipe(eslint({
			fix: true,
		}))
		.pipe(eslint.format())
		.pipe(gulp.dest(Paths.SOURCE));
};
const scripts = (done) => {
	return gulp.series('js')(done);
};

const viewsStatic = () => {
	return gulp.src(Sources.HTML, {base: Paths.SOURCE})
		.pipe(gulp.dest(Paths.DEST));
};
const views = (done) => {
	return gulp.series(['viewsStatic'])(done);
};

// Statics
const json = () => {
	return gulp.src(Sources.JSON, {base: Paths.SOURCE})
		.pipe(gulp.dest(Paths.DEST));
};
const resources = (done) => {
	return gulp.series(['json'])(done);
};

// // Commands
const clean = () => {
	return gulp.src([`${Paths.DEST}/*`], {read: false})
		.pipe(gulpClean());
};
const build = (done) => {
	return gulp.series('clean', gulp.parallel('scripts', 'views', 'resources'))(done);
};
const watch = (done) => {
	return gulp.series('build', () => {
		gulp.watch(Sources.HTML, gulp.series('views'));
		// Watch Scripts
		gulp.watch(Sources.JS, gulp.series('js'));
		// Watch Resources
		gulp.watch(Sources.JSON, gulp.series('resources'));
	})(done);
};

module.exports = {
	js,
	jsSrcFix,
	scripts,

	viewsStatic,
	views,

	json,
	resources,

	clean,
	build,
	watch,
};
