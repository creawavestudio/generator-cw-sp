module.exports = () => {
  $.gulp.task("build:sprite", done => {
    const spriteData =
      $.gulp.src($.config.paths.sprites.src)
      .pipe($.spritesmith({
        imgName: "sprite.png",
        cssName: "_sprite.scss",
        padding: 2,
        cssFormat: "scss",
        algorithm: "binary-tree",
        cssTemplate: "src/templates/scss.template.mustache",
        imgPath: "/dist/img/sprite.png",
        // cssVarMap: sprite => sprite.name = sprite.name
      }));

    spriteData.img.pipe($.gulp.dest($.config.paths.sprites.img));
    spriteData.css.pipe($.gulp.dest($.config.paths.sprites.dest));

    done();
  });
}
