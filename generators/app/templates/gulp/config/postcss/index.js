const browserReporter = require("postcss-browser-reporter");
const colorShort = require("postcss-color-short");
const assets = require("postcss-assets");
const center = require("postcss-center");
const size = require("postcss-size");
const immutable = require("immutable-css");
const rucksackcss = require("rucksack-css");
const ifmedia = require("../media");

module.exports = [
  ifmedia,
  colorShort,
  rucksackcss,
  center,
  size,
  browserReporter({ selector: "body:before" }),
  immutable(),
  assets({
    basePath: "markup/",
    loadPaths: [$.config.paths.img.assets]
  })
];
