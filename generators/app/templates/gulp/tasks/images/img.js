module.exports = () => {
  $.gulp.task("build:img", () => {
    return $.gulp.src($.config.paths.img.src)
      .pipe($.gulpif($.imagemin([
        //  imgCompress({
        //    loops:  4,
        //    min:  70,
        //    max:  80,
        //    quality:  'high'
        //  }),
        $.imagemin.gifsicle(),
        $.imagemin.optpng(),
        $.imagemin.svgo()
      ])))
      .pipe($.gulp.dest($.config.paths.img.dist));
  });
};
