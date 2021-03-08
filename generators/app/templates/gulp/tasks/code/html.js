const proc = require("../../config/constants");

module.exports = () => {
  $.gulp.task("build:html", () => {
    if (!$.gp.html || proc.html === "html") {
      return $.gulp.src($.config.paths.html.src)
        .pipe($.gulp.dest($.config.paths.html.dist))
        .pipe($.browserSync.reload({
          stream: true
        }));
    }

    return $.gulp.src($.config.paths.html.src)
      .pipe($.plumberNotifier({
        errorHandler: function (error) {
          console.log(error.message);
          this.emit("end");
        }
      }))
      .pipe($.gp.html(proc.html === "pug" ? {
        pretty: true
      } : null))
      .pipe($.gulp.dest($.config.paths.html.dist))
      .pipe($.browserSync.reload({
        stream: true
      }));
  });
};
