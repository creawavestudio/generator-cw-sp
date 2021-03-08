const path = require("path");

module.exports = {
  extractAll: false,
  output: {
    path: path.join(__dirname, "../../../markup/dist/css")
  },
  queries: {
    "only screen and (max-width:640px)": "mobile"
  }
};
