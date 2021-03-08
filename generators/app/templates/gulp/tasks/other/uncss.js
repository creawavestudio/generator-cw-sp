module.exports = () => {
	$.gulp.task("build:uncss", () => {
		return $.gulp.src($.config.paths.styles.middle)
      .pipe($.postcss([require("postcss-uncss")({ html: ["app/html/**/*.html"] })]))
			.pipe($.gulp.dest($.config.paths.styles.dist));
	});
}