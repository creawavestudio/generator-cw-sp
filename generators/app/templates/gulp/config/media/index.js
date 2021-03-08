const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const configPath = path.join(__dirname, "./config.json");
let config = fs.readFileSync(configPath, "utf-8");

config = JSON.parse(config);

module.exports = function (opts) {
  opts = opts || {};
  opts._queries = [];

  return {
    postcssPlugin: "postcss-if-media",
    Once: function Once (css, _ref) {
      const result = _ref.result;
      css.walkRules(function (rule) {
        const queries = {};
        rule.each(function (node) {
          if (
            node.type === "rule" &&
            (node.selector.indexOf("/") === 0 ||
              node.selector.indexOf("/ ") === 0)
          ) {
            const qblock = node;
            let prev = qblock;

            node.each(function (node) {
              if (node.type === "decl" || node.type === "comment") {
                if (node.value) {
                  node.value += " " + qblock.selector;
                } else {
                  node.text += " " + qblock.selector;
                }

                rule.insertAfter(prev, node.remove());
                prev = node;
              } else {
                throw node.error(
                  "You can only have properties/comments inside a block inline query. " +
                    node.parent.parent.selector,
                  {
                    plugin: "postcss-if-media"
                  }
                );
              }
            });

            qblock.remove();
          }

          if (
            (node.type === "decl" || node.type === "comment") &&
            ((node.value || node.text).indexOf(" / ") + 1 ||
              (node.value || node.text).indexOf(" \\ m ") + 1)
          ) {
            processIfValues(css, result, rule, node, queries);
          } else if (
            (node.type === "decl" || node.type === "comment") &&
            (node.value || node.text).indexOf("/ ") + 1
          ) {
            node.warn(
              result,
              "Appears to be a malformed `*media` query -> " + node
            );
          }
        });

        if (Object.keys(queries).length) {
          createAtRules(css, rule, queries);
          opts._queries.concat(queries);
        }
      });
    }
  };
};

module.exports.postcss = true;

function processIfValues (css, result, rule, decl, queries) {
  const re = /(.*)\s+(?:\/|\*)\s+(.*)/;
  const re2 = /\s/g;
  let hash = null;
  let val = null;

  const match = decl.value ? decl.value.match(re) : decl.text.match(re);

  if (match && match[1] && match[2]) {
    if (decl.value) {
      decl.value = match[1];
    } else {
      decl.text = match[1];
    }

    hash = match[2].replace(re2, "");
    val = transformVariable(match[2]);

    if (!queries[hash]) {
      queries[hash] = {
        arg: val,
        sel: rule.selector,
        props: []
      };
    }

    queries[hash].props.push({
      name: decl.prop,
      value: match[1],
      query: val,
      hash: hash,
      decl: decl
    });
  } else {
    decl.warn(result, "Appears to be a malformed `*media` query -> " + decl);
  }
}

function createAtRules (css, rule, queries) {
  const parent = rule.parent;
  let prev = rule;

  for (const k in queries) {
    const q = queries[k];
    const at = postcss.atRule({
      name: "media",
      params: q.arg,
      source: rule.source
    });
    const qr = postcss.rule({
      selector: q.sel,
      source: rule.source
    });

    at.append(qr);

    for (let i = 0; i < q.props.length; i++) {
      const prop = q.props[i];
      qr.append(prop.decl.remove());
    }

    parent.insertAfter(prev, at);
    prev = at;
  }
}

function transformVariable (val) {
  const trimmedVal = val.replace(/\s+/g, " ").trim();
  const matched = trimmedVal.replace(/\-\w+/g, (value) => {
    value = value.replace("-", "");
    return config[value];
  });

  return matched;
}
