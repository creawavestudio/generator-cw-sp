module.exports = () => {
	if ($.IS_DEV) return;

	$.gulp.task("build:start", $.gulp.series("compile", "build:img"));
	$.gulp.task("reload", () => { $.browserSync.reload(); });
	$.gulp.task("build:webp", () =>
		$.gulp.src($.config.paths.img.src)
		.pipe($.gp.webp({ quality: 100 }))
		.pipe($.gulp.dest($.config.paths.img.dist))
	);
}