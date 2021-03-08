const proc = require("../../config/constants");
const TSoptions = {
  noImplicitAny: true,
  strictBindCallApply: true,
  alwaysStrict: true,
  pretty: true,
};

module.exports = () => {
  $.gulp.task("build:js", () => {
    return $.gulp
      .src($.config.paths.javascript.src)
      .pipe(
        $.plumberNotifier({
          errorHandler: function (error) {
            console.error(error.message);
            this.emit("end");
          },
        })
      )
      .pipe($.gulpif($.IS_PROD, $.sourcemaps.write("./maps")))
      .pipe($.gulpif($.IS_PROD, $.rename({ suffix: ".min" })))
      .pipe($.gp.js(proc.js === "ts" ? TSoptions : null))
      .pipe($.gulpif($.IS_PROD, $.uglify()))
      .pipe($.gulp.dest($.config.paths.javascript.dist))
      .pipe($.browserSync.reload({ stream: true }));
  });
};
