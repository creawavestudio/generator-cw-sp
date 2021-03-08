module.exports = () => {
  $.gulp.task("serve", done => {
    $.browserSync({
      server: {
        baseDir: "markup",
        index: "html/index.html",
        // tunnel: $.config.cfg.srv.tunel,
        tunnel: $.config.cfg.srv.addressTunel
      },
      ui: {
        port: $.config.cfg.srv.port2
      },
      notify: true,
      open: false,
      port: $.config.cfg.srv.port2
    });

    done();
  });
};
