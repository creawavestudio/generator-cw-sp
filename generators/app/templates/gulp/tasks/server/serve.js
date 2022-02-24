module.exports = () => {
  $.gulp.task("serve", (done) => {
    $.browserSync({
      server: {
        baseDir: "markup",
        index: "index.html",
        // Tunnel: $.config.cfg.srv.tunel,
        tunnel: $.config.cfg.srv.addressTunel,
      },
      ui: {
        port: $.config.cfg.srv.port2,
      },
      notify: true,
      open: true,
      port: $.config.cfg.srv.port2,
    });

    done();
  });
};
