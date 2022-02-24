const acss = require("../../config/atomizer/index.js");

module.exports = () => {
  $.gulp.task("build:acss", () => {
    return $.gulp
      .src($.config.paths.html.middle)
      .pipe(
        acss({
          outfile: "atomic.scss",
          acssConfig: require("../../config/atomizer/conf.js"),
          addRules: require("../../config/atomizer/custom-rules.js"),
          cssOptions: {},
        })
      )
      .pipe($.gulp.dest($.config.paths.styles.acss));
  });
};
