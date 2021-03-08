module.exports = () => {
  const tasks = ["build:css", "build:js", "build:html", "build:acss"];

  if ($.IS_PROD) {
    tasks.push("build:img");
  }

  $.gulp.task("compile", $.gulp.series.apply($.gulp, tasks), (done) => {
    $.gulp.src("src/fonts/**/*").pipe($.gulp.dest("app/public/fonts"));

    done();
  });
};
