const NODE_ENV = process.env.NODE_ENV || "development";
const tasks = ["compile"];

if (NODE_ENV !== "production") {
  tasks.push(...["serve", "watch"]);
}

global.$ = {
  fs: require("fs"),
  IS_DEV: NODE_ENV === "development",
  IS_PROD: NODE_ENV === "production",
  gulp: require("gulp"),
  csso: require("gulp-csso"),
  browserSync: require("browser-sync"),
  rename: require("gulp-rename"),
  concat: require("gulp-concat"),
  uglify: require("gulp-uglify"),
  notify: require("gulp-notify"),
  cached: require("gulp-cached"),
  spritesmith: require("gulp.spritesmith"),
  dependents: require("gulp-dependents"),
  magicImporter: require("node-sass-magic-importer"),
  plumberNotifier: require("gulp-plumber-notifier"),
  gcmq: require("gulp-group-css-media-queries"),
  imagemin: require("gulp-imagemin"),
  sourcemaps: require("gulp-sourcemaps"),
  minifyCss: require("gulp-clean-css"),
  postcss: require("gulp-postcss"),
  html2pug: require("html2pug"),
  gulpif: require("gulp-if"),
  critical: require("critical"),
  cssnano: require("gulp-cssnano"),
  beautify: require("pug-beautify"),
  config: require("./gulp/config/config.json"),
  gp: require("./gulp/config/constants")(),
  path: {
    tasks: require("./gulp/config/tasks.js")
  },
};

$.path.tasks.forEach((taskPath) => require(taskPath)());
$.gulp.task("default", $.gulp.parallel.apply($.gulp, tasks));
