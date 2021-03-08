module.exports = () => {
	$.gulp.task("watch", done => {
		$.gulp.watch($.config.paths.styles.src, $.gulp.series("build:css"));
		$.gulp.watch($.config.paths.javascript.src, $.gulp.series("build:js"));
		$.gulp.watch($.config.paths.html.watch, $.gulp.series("build:html"));
		$.gulp.watch($.config.paths.html.middle, $.gulp.series("build:acss"));
		$.gulp.watch($.config.paths.img.src, $.gulp.series("build:img"));

		done();
	});
}