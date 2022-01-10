const proc = require('./proc.json')
const constants = {}

module.exports = () => {
    constants.css = require('gulp-sass')
    constants.html = proc.html !== 'html' ? require(`gulp-${proc.html}`) : null
    constants.js = require(`gulp-${proc.js === 'js' ? 'babel' : 'typescript'}`)

    return constants
}
