const {
    log,
} = console;

const {
    bold, green,
} = require('picocolors');

const server = require('browser-sync').create('Dev Server');

const isDevMode = process.argv.includes('--dev');

if (isDevMode) {
	const portfinder = require('portfinder');
	const compress = require('compression');

	portfinder.getPort({
		port: 3000,
		stopPort: 5000,
	}, (err, port) => {
		server.init({
			server: './',
			directory: false,
			port: port,
			open: true, // Автоматически откроется в браузере
			logLevel: 'silent',
			ghostMode: false,
			notify: true,
			ui: false,
			middleware: [ compress() ],
		}, () => {
			const urls = server.getOption('urls');

			log(`${green('site:server')}\n${bold('Access URL:')} ${urls.get('local')}\n`);
		});

		server.watch('./js/*.js').on('change', server.reload);
		server.watch('./src/**/*.html').on('change', server.reload);
	});
}

const { task, src, dest, series, watch } = require('gulp');

const dartSass = require('sass');
const gulpSass = require('gulp-sass');

const sass = gulpSass(dartSass);

const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');

const scss = () => {
	console.log(`[scss] ${bold(green('done'))}`);

	return src('./scss/*.scss', { sourcemaps: false })
		.pipe(sass({ outputStyle: 'expanded' }))
		.pipe(postcss([
			autoprefixer()
		]))
		.pipe(dest('./css', { sourcemaps: false }))
		.pipe(server.stream());
};

const path = require('path');
const fileInclude = require('gulp-file-include');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');

const Templater = require('../builder/modules/nunjucks/templater');
const templater = new Templater();

templater.init({
	partials: 'src/html/components',
}, {});

const gulpNunjucks = require('../builder/modules/nunjucks/gulp');
const pipeErrorStop = require('../builder/modules/pipe-error-stop');
const tap = require('../builder/modules/tap');


class Database {
	constructor(initial = {}) {
	  this._store = initial;
	  this._lang = 'en';
	}

	getStore() {
		return this._store[this._lang];
	}


	set(name, data) {
		this._store[this._lang][name] = data;
	}

	setLang(lang) {
		this._lang = lang;
	}
}

const DB = new Database(require('../src/html/template.data'));

const html = (done) => {
	let templateName = '';
    let hasError = false;

	const stream = src('./src/html/pages/*.html')
		.pipe(plumber({
			errorHandler: (error) => {
				hasError = true;
				console.error(`[nunjucks] error: check the template ${error.plugin}`);
				console.error(error);
			},
		}))
		.pipe(tap((file) => {
			let template = path.basename(file.path);
			let lang = 'en';

			DB.setLang(lang);
			DB.set('template', template);
			DB.set('lang', lang);
		}))
		.pipe(fileInclude())
		.pipe(gulpNunjucks(templater, DB))
		.pipe(pipeErrorStop({
			errorCallback: (error) => {
			  hasError = true;
			  error.message = error.message.replace(/(unknown path)/, templateName);

			  console.error(`\n${error.name}: ${error.message}\n`);
			},
			successCallback: () => {
			  hasError = false;
			},
		}))
		.pipe(rename({
			dirname: '',
		}))
		.pipe(dest('./'));

	stream.on('end', () => {
		console.log(`[nunjucks] ${hasError ? bold(red('ERROR')) : bold(green('done'))}`);

		done();
	});

	stream.on('error', (error) => {
		console.log(error);
		done(error);
	});

	done();
};

function watcher() {
	watch('./scss/**/*.scss', { usePolling: true }, scss);
	watch('./src/html/**/*.html', { usePolling: true }, html);
}

if (isDevMode) {
	series(scss, html, watcher)();
} else {
	series(scss, html)();
}

