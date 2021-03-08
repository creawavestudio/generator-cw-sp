module.exports = () => {
	$.gulp.task("build:critical", () => {
    return $.critical.generate({
      base: "app/",
      src: "html/index.html", 
      inline: true,
      minify: true,
      width: 1920,
      height: 1080
    }).then(output => {
      const html = output.toString("utf8").replace(/[ \n\t\r]+?/g, "");
      const styles = /<style>(.*?)<\/style>/g.exec(html);
      const pug = $.html2pug(styles[0], { tabs: true, fragment: true });

      $.fs.writeFile("src/pug/helpers/_critical.pug", pug, err => err ? console.error(err) : 0);
    });
	});
}