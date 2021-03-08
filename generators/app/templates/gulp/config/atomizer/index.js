/* eslint-env node, gulp */

const Atomizer = require("./atomizer");
const arrayUniq = require("array-uniq");
const path = require("path");
const through = require("through2");
const PluginError = require("plugin-error");

const PLUGIN_NAME = "gulp-atomizer";

// Parse text to find Atomic CSS classes
// let foundClasses = atomizer.findClassNames()

// Generate Atomizer configuration from an array of Atomic classnames
// let finalConfig = atomizer.getConfig(foundClasses, defaultConfig)

// Generate Atomic CSS from configuration
// let css = atomizer.getCss(finalConfig)

module.exports = function (options = {}) {
  if (typeof options === "string") {
    options = { outfile: options };
  }

  // destructure options
  let { outfile, acssConfig, cssOptions, addRules } = options;

  // default options
  outfile = outfile || "atomic.css";
  acssConfig = acssConfig || {};

  // global variables
  let latestFile;
  let latestMod;
  let foundClasses = [];
  let acss;

  // create the file handler
  const gulpTransformer = function (file, unused, cb) {
    if (file.isNull()) {
      // nothing to do
      return cb(null, file);
    } else if (file.isStream()) {
      // file.contents is a Stream.  We don't support streams
      this.emit("error", new PluginError(PLUGIN_NAME, "Streams not supported!"));
    } else if (file.isBuffer()) {
      // lazy init the acss class
      if (!acss) {
        acss = new Atomizer({ verbose: true });

        if (addRules) {
          acss.addRules(addRules);
        }
      }

      // generate the class names and push them into the global collector array
      const html = String(file.contents);
      const classes = acss.findClassNames(html);

      foundClasses = Array.prototype.concat(foundClasses, classes);

      // make a note of this file if it's the newer than we've seen before
      if (!latestMod || (file.stat && file.stat.mtime > latestMod)) {
        latestFile = file;
        latestMod = file.stat && file.stat.mtime;
      }

      // tell the engine we're done
      cb();
    }
  };

  const endStream = function (cb) {
    // nothing in, nothing out
    if (!latestFile || !acss) {
      return cb();
    }
    // remove duplicate classes
    const classes = arrayUniq(foundClasses);
    // merge the classes into the user's config
    const finalConfig = acss.getConfig(classes, acssConfig);
    // get the actual css
    const cssOut = acss.getCss(finalConfig, cssOptions);

    // create the output file
    // (take the metadata from most recent file)
    const atomicFile = latestFile.clone({ contents: false });
    atomicFile.path = path.join(latestFile.base, outfile);
    atomicFile.contents = Buffer.from(cssOut);

    // all done!
    this.push(atomicFile);
    cb();
  };

  return through.obj(gulpTransformer, endStream);
};
