const _ = require("lodash");

const utils = {};

// Hex value to rgb object
utils.hexToRgb = function (hex /*: string */) /*: Rgb */ {
  let result;

  // Shorthand to full form
  hex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  // eslint-disable-next-line prefer-const
  result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    }
    : null;
};

/**
 * Helper function to handle merging array of strings
 * @param  {mixed} a Data of the first merge param
 * @param  {mixed} b Data of the second merge param
 * @return {mixed}   The merged array
 */
utils.handleMergeArrays = function (a, b) {
  if (_.isArray(a) && _.isArray(b)) {
    return _.union(a, b).sort();
  }
};

// Merge atomizer configs into a single config
utils.mergeConfigs = function (configs /*: Config[] */) /*: Config */ {
  // TODO: Offer option to warn on conflicts
  return _.mergeWith.apply(null, configs.concat(utils.handleMergeArrays));
};

// Returns a repeated string by X amount
utils.repeatString = function (pattern /*: string */, count /*: integer */) {
  let result = "";
  if (count < 1) {
    return result;
  }

  while (count > 1) {
    if (count & 1) {
      result += pattern;
    }

    if ((count >>= 1)) pattern += pattern;
  }

  return result + pattern;
};

module.exports = utils;
