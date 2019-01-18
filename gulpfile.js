'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const gulpClean = require('gulp-clean');
const bump = require('gulp-bump');

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
const js = () => {
	return gulp.src(Sources.JS, {base: Paths.SOURCE})
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(gulp.dest(Paths.DEST));
};
const jsSrcFix = () => {
	return gulp.src(Sources.JS, {base: Paths.SOURCE})
		.pipe(eslint({
			fix: true
		}))
		.pipe(eslint.format())
		.pipe(gulp.dest(Paths.SOURCE));
};
const scripts = done => {
	return gulp.series('js')(done);
};

// Email
const emailStyles = () => {
	return gulp.src(Sources.EMAIL_LESS, {base: Paths.SOURCE})
		.pipe(gulp.dest(Paths.EMAIL_DEST));
};
const styles = done => {
	return gulp.series('emailStyles')(done);
};

const viewsEmail = () => {
	return gulp.src(Sources.EMAIL_PUG, {base: 'app/server/email'})
		.pipe(gulp.dest(Paths.EMAIL_DEST));
};
const views = done => {
	return gulp.series('viewsEmail')(done);
};

// Statics
const json = () => {
	return gulp.src(Sources.JSON, {base: Paths.SOURCE})
		.pipe(gulp.dest(Paths.DEST));
};
const resources = done => {
	return gulp.series(['json'])(done);
};

// // Commands
const clean = () => {
	return gulp.src([`${Paths.DEST}/*`], {read: false})
		.pipe(gulpClean());
};
const build = done => {
	return gulp.series('clean', gulp.parallel('scripts', 'styles', 'views', 'resources'))(done);
};
const watch = done => {
	return gulp.series('build', () => {
		gulp.watch(Sources.EMAIL_LESS, 'styles');
		gulp.watch(Sources.EMAIL_PUG, 'views');
		// Watch Scripts
		gulp.watch(Sources.JS, 'js');
		// Watch Resources
		gulp.watch(Sources.JSON, 'resources');
	})(done);
};

const bumpMajor = () => {
	return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
		.pipe(bump({type: 'major'}))
		.pipe(gulp.dest('./'));
};
const bumpMinor = () => {
	return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
		.pipe(bump({type: 'minor'}))
		.pipe(gulp.dest('./'));
};
const bumpPatch = () => {
	return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
		.pipe(bump({type: 'patch'}))
		.pipe(gulp.dest('./'));
};
const bumpPrerelease = () => {
	return gulp.src(['./package.json', './README.md', 'app/server/config.json'], {base: './'})
		.pipe(bump({type: 'prerelease'}))
		.pipe(gulp.dest('./'));
};

module.exports = {
	js,
	jsSrcFix,
	scripts,

	emailStyles,
	styles,
	viewsEmail,
	views,

	json,
	resources,

	clean,
	build,
	watch,

	bumpMajor,
	bumpMinor,
	bumpPatch,
	bumpPrerelease
};
