/*
 * Copyright (c) 2015, Yahoo Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

'use strict'

const _ = require('lodash')
const utils = require('./lib/utils')
const JSS = require('./lib/jss')
const Grammar = require('./lib/grammar')
const objectAssign = require('object-assign')
const XRegExp = require('xregexp')

const RULES = require('./rules.js').concat(require('./helpers.js'))

/**
 * Constructor
 */
function Atomizer(options /*: AtomizerOptions */, rules /*: AtomizerRules */) {
    this.verbose = (options && options.verbose) || false
    this.rules = []
    // We have two different objects to avoid name collision
    this.rulesMap = {}
    this.helpersMap = {}

    // Add rules
    this.addRules(rules || RULES)
}

/**
 * AddRules
 * @public
 */
Atomizer.prototype.addRules = function (
    rules, /*: AtomizerRules */
) /*: void */ {
    rules.forEach(function (rule) {
        const ruleFound =
            rule.type === 'pattern' &&
            Object.prototype.hasOwnProperty.call(this.rulesMap, rule.matcher)
        const helperFound =
            rule.type === 'helper' &&
            Object.prototype.hasOwnProperty.call(this.helpersMap, rule.matcher)

        if (
            (ruleFound &&
                !_.isEqual(this.rules[this.rulesMap[rule.matcher]], rule)) ||
            (helperFound &&
                !_.isEqual(this.rules[this.helpersMap[rule.matcher]], rule))
        ) {
            throw new Error(
                'Rule ' + rule.matcher + ' already exists with a different defintion.',
            )
        }

        if (!ruleFound && !helperFound) {
            // Push new rule to this.rules and update rulesMap
            this.rules.push(rule)

            if (rule.type === 'pattern') {
                this.rulesMap[rule.matcher] = this.rules.length - 1
            } else {
                this.helpersMap[rule.matcher] = this.rules.length - 1
            }
        }
    }, this)

    // Invalidates syntax
    this.syntax = null
    this.syntaxSimple = null
}

/**
 * GetClassNameSyntax()
 * @private
 */
Atomizer.prototype.getSyntax = function (isSimple) /*: string */ {
    if (isSimple && !this.syntaxSimple) {
        this.syntaxSimple = new Grammar(this.rules).getSyntax(true)
    }

    if (!isSimple && !this.syntax) {
        // All Grammar and syntax parsing  should be in the Grammar class
        this.syntax = new Grammar(this.rules).getSyntax()
    }

    return isSimple ? this.syntaxSimple : this.syntax
}

/**
 * FindClassNames
 */
Atomizer.prototype.findClassNames = function (
    src, /*: string */
) /*: string[] */ {
    // Using object to remove dupes
    const classNamesObj = {}
    let className
    const classNameSyntax = this.getSyntax()
    let match = classNameSyntax.exec(src)

    while (match !== null) {
        // Strip boundary character
        className = match[1]

        // Assign to classNamesObj as key and give it a counter
        classNamesObj[className] = (classNamesObj[className] || 0) + 1

        // Run regex again
        match = classNameSyntax.exec(src)
    }

    // Return an array of the matched class names
    return _.keys(classNamesObj)
}

/**
 * Get Atomizer config given an array of class names and an optional config object
 * examples:
 *
 * getConfig(['Op(1)', 'D(n):h', 'Fz(heading)'], {
 *     custom: {
 *         heading: '80px'
 *     },
 *     breakPoints: {
 *         'sm': '@media(min-width:500px)',
 *         'md': '@media(min-width:900px)',
 *         'lg': '@media(min-width:1200px)'
 *     },
 *     classNames: ['D(b)']
 * }, {
 *     rtl: true
 * })
 *
 * getConfig(['Op(1)', 'D(n):h'])
 */
Atomizer.prototype.getConfig = function (
    classNames /*: string[] */,
    config, /*: AtomizerConfig */
) /*: AtomizerConfig */ {
    config = config || {classNames: []}
    // Merge classnames with config
    config.classNames = this.sortCSS(
        _.union(classNames || [], config.classNames),
    )
    return config
}

/**
 * Return sorted rule
 */
Atomizer.prototype.sortCSS = function (classNames /* string[] */) {
    // 1. sort by alphabetical order
    classNames = classNames.sort()

    // 2. pseudo class: link > visited > focus > hover > active.
    const pseudoStyleOrder = [':li', ':vi', ':f', ':h', ':a']

    function sortPseudoClassNames(a, b) {
        function getMatchedIndex(value) {
            return _.findIndex(pseudoStyleOrder, function findMatched(pseudoClass) {
                return _.includes(value, pseudoClass)
            })
        }

        const aMatches = Grammar.matchValue(a)
        const bMatches = Grammar.matchValue(b)
        const aIndex = getMatchedIndex(a)
        const bIndex = getMatchedIndex(b)

        // Remain same default sort logic
        if (aMatches.named !== bMatches.named) {
            return a.localeCompare(b)
        }

        return aIndex - bIndex
    }

    classNames = classNames.sort(sortPseudoClassNames)

    return classNames
}

/**
 * Return a parsed tree given a config and css options
 */
Atomizer.prototype.parseConfig = function (
    config /*: AtomizerConfig */,
    options, /*: CSSOptions */
) /*: Tree */ {
    const tree = {}
    const classNameSyntax = this.getSyntax(true)
    const warnings = []
    const isVerbose = Boolean(this.verbose)
    let classNames = config.classNames

    if (!_.isArray(config.classNames)) {
        return tree
    }

    options = options || {}

    if ('exclude' in config) {
        classNames = _.difference(classNames, config.exclude)
    }

    classNames.forEach(function (className) {
        const match = XRegExp.exec(className, classNameSyntax)
        let rule
        let ruleIndex
        let treeo
        let rgb
        let values

        if (!match || (!match.atomicSelector && !match.selector)) {
            // No match, no op
            return
        }

        // Check where this rule belongs to
        // atomicSelector is the class name before the params: e.g. className(param)
        // selector is the class name if params is not required
        // we look both in rules and in helpers where this class belongs to
        if (
            Object.prototype.hasOwnProperty.call(this.rulesMap, match.atomicSelector)
        ) {
            ruleIndex = this.rulesMap[match.atomicSelector]
        } else if (
            Object.prototype.hasOwnProperty.call(
                this.helpersMap,
                match.atomicSelector,
            )
        ) {
            ruleIndex = this.helpersMap[match.atomicSelector]
        } else if (
            Object.prototype.hasOwnProperty.call(this.helpersMap, match.selector)
        ) {
            ruleIndex = this.helpersMap[match.selector]
        } else {
            // Not a valid class, no op
            return
        }

        // Get the rule that this class name belongs to.
        // this is why we created the dictionary
        // as it will return the index given a matcher.
        // eslint-disable-next-line prefer-const
        rule = this.rules[ruleIndex]

        // eslint-disable-next-line prefer-const
        treeo = {
            className: match[1],
            declarations: _.cloneDeep(rule.styles),
        }

        if (!tree[rule.matcher]) {
            tree[rule.matcher] = []
        }

        if (match.parentSelector) {
            treeo.parentSelector = match.parentSelector
        }

        if (match.parent) {
            treeo.parent = match.parent
        }

        if (match.parentPseudo) {
            treeo.parentPseudo = match.parentPseudo
        }

        if (match.parentSep) {
            treeo.parentSep = match.parentSep
        }

        // Given values, return their valid form
        if (match.atomicValues) {
            values = match.atomicValues

            // Values can be separated by a comma
            // parse them and return a valid value
            values = values.split(',').map(function (value, index) {
                const matchVal = Grammar.matchValue(value)
                let propAndValue

                if (!matchVal) {
                    // In cases like: End(-), matchVal will be null.
                    return null
                }

                if (matchVal.number) {
                    if (rule.allowParamToValue || rule.type === 'helper') {
                        value = matchVal.number
                        if (matchVal.unit) {
                            value += matchVal.unit
                        }
                    } else {
                        // Treat as if we matched a named value
                        matchVal.named = [matchVal.number, matchVal.unit].join('')
                    }
                }

                if (matchVal.fraction) {
                    // Multiplying by 100 then by 10000 on purpose (instead of just multiplying by 1M),
                    // making clear the steps involved:
                    // percentage: (numerator / denominator * 100)
                    // 4 decimal places:  (Math.round(percentage * 10000) / 10000)
                    value =
                        Math.round(
                            (matchVal.numerator / matchVal.denominator) * 100 * 10000,
                        ) /
                        10000 +
                        '%'
                }

                if (matchVal.hex) {
                    if (matchVal.hex !== matchVal.hex.toLowerCase()) {
                        console.warn(
                            'Warning: Only lowercase hex digits are accepted. No rules will be generated for `' +
                            matchVal.input +
                            '`',
                        )
                        value = null
                    } else if (matchVal.alpha) {
                        rgb = utils.hexToRgb(matchVal.hex)
                        value = [
                            'rgba(',
                            rgb.r,
                            ',',
                            rgb.g,
                            ',',
                            rgb.b,
                            ',',
                            matchVal.alpha,
                            ')',
                        ].join('')
                    } else {
                        value = matchVal.hex
                    }
                }

                if (matchVal.named) {
                    // First check if 'inh' is the value
                    if (matchVal.named === 'inh') {
                        value = 'inherit'
                    } else if (
                        rule.arguments &&
                        index < rule.arguments.length &&
                        Object.keys(rule.arguments[index]).indexOf(matchVal.named) >= 0
                    ) {
                        value = rule.arguments[index][matchVal.named]
                    } else {
                        propAndValue = [
                            match.atomicSelector,
                            '(',
                            matchVal.named,
                            ')',
                        ].join('')

                        // No custom, warn it
                        if (!config.custom) {
                            warnings.push(propAndValue)
                            // Set to null so we don't write it to the css
                            value = null
                        } else if (
                            Object.prototype.hasOwnProperty.call(config.custom, propAndValue)
                        ) {
                            value = config.custom[propAndValue]
                        } else if (
                            Object.prototype.hasOwnProperty.call(
                                config.custom,
                                matchVal.named,
                            )
                        ) {
                            value = config.custom[matchVal.named]
                        } else {
                            warnings.push(propAndValue)
                            // Set to null so we don't write it to the css
                            value = null
                        }
                    }
                }

                return value
            })
        }

        if (match.valuePseudoClass) {
            treeo.valuePseudoClass = match.valuePseudoClass
        }

        if (match.valuePseudoElement) {
            treeo.valuePseudoElement = match.valuePseudoElement
        }

        if (match.breakPoint) {
            treeo.breakPoint = match.breakPoint
        }

        // Before we assign, let's take care of the declarations
        // iterate declarations so we can replace values with their valid form
        for (const prop in treeo.declarations) {
            if (values) {
                values.forEach(function (value, index) {
                    // Plug IE hacks for know properties
                    if (options.ie) {
                        // Block formatting context on old IE
                        /* istanbul ignore else  */
                        if (
                            (prop === 'display' && value === 'inline-block') ||
                            (prop === 'overflow' && value !== 'visible')
                        ) {
                            treeo.declarations.zoom = 1
                        }

                        /* istanbul ignore else  */
                        if (prop === 'display' && value === 'inline-block') {
                            treeo.declarations['*display'] = 'inline'
                        }

                        /* istanbul ignore else  */
                        if (prop === 'opacity') {
                            treeo.declarations.filter =
                                'alpha(opacity=' + parseFloat(value, 10) * 100 + ')'
                        }
                    }

                    if (value !== null && treeo.declarations) {
                        // Value could be an object for custom classes with breakPoints
                        // e.g.
                        // 'custom': {
                        //     'P($gutter)': {
                        //         default: '10px',
                        //         sm: '12px',
                        //         md: '14px',
                        //         lg: '20px'
                        //     }
                        // }
                        const placeholderPattern = new RegExp('\\$' + index, 'g')
                        if (_.isObject(value)) {
                            Object.keys(value).forEach(function (bp) {
                                // Don't continue if we can't find the breakPoint in the declaration
                                if (
                                    !Object.prototype.hasOwnProperty.call(
                                        config,
                                        'breakPoints',
                                    ) ||
                                    !Object.prototype.hasOwnProperty.call(config.breakPoints, bp)
                                ) {
                                    return
                                }

                                treeo.declarations[config.breakPoints[bp]] =
                                    treeo.declarations[config.breakPoints[bp]] || {}
                                treeo.declarations[config.breakPoints[bp]][
                                    prop
                                    ] = treeo.declarations[prop].replace(
                                    placeholderPattern,
                                    value[bp],
                                )
                            })
                            // Handle default value in the custom class
                            if (!Object.prototype.hasOwnProperty.call(value, 'default')) {
                                // Default has not been passed, make sure we delete it
                                delete treeo.declarations[prop]
                            } else {
                                treeo.declarations[prop] = treeo.declarations[prop].replace(
                                    placeholderPattern,
                                    value.default,
                                )
                            }
                        } else {
                            treeo.declarations[prop] = treeo.declarations[prop].replace(
                                placeholderPattern,
                                value,
                            )
                        }
                    } else {
                        treeo.declarations = null
                    }
                })
                // If any of the arguments in the declaration weren't replaced, then we need to clean them up
                if (
                    treeo.declarations &&
                    treeo.declarations[prop] &&
                    treeo.declarations[prop].indexOf('$') >= 0
                ) {
                    treeo.declarations[prop] = treeo.declarations[prop].replace(
                        /[,\s]?\$\d+/g,
                        '',
                    )
                }
            }

            // Add important for the following cases:
            //    - `!` was used in the class name
            //    - rule has a parent class, a namespace was given and the rule is not a helper [1]
            // [1] rules with a parent class won't have a namespace attached to the selector since
            //     it prevents people from using the parent class at the root element (<html>). But
            //     to give it extra specificity (to make sure it has more weight than normal atomic
            //     classes) we add important to them. Helper classes don't need it because they do
            //     not share the same namespace.
            if (
                treeo.declarations &&
                (match.important ||
                    (match.parent && options.namespace && rule.type !== 'helper'))
            ) {
                treeo.declarations[prop] += ' !important'
            }
        }

        tree[rule.matcher].push(treeo)
    }, this)

    // Throw warnings
    if (isVerbose && warnings.length > 0) {
        warnings.forEach(function (className) {
            console.warn(
                [
                    'Warning: Class `' +
                    className +
                    '` is ambiguous, and must be manually added to your config file:',
                    `'custom': {`,
                    '    "' + className + '": <YOUR-CUSTOM-VALUE>',
                    '}',
                ].join('\n'),
            )
        })
    }

    return tree
}

/**
 * Get CSS given an array of class names, a config and css options.
 * examples:
 *
 * getCss({
 *     custom: {
 *         heading: '80px'
 *     },
 *     breakPoints: {
 *         'sm': '@media(min-width:500px)',
 *         'md': '@media(min-width:900px)',
 *         'lg': '@media(min-width:1200px)'
 *     },
 *     classNames: ['D(b)', 'Op(1)', 'D(n):h', 'Fz(heading)']
 * }, {
 *     rtl: true
 * })
 *
 * @public
 */
Atomizer.prototype.getCss = function (
    config /*: AtomizerConfig */,
    options, /*: CSSOptions */
) /*: string */ {
    const jss = {}
    let tree
    let content = ''
    let breakPoints

    options = objectAssign(
        {},
        {
            // Require: [],
            // morph: null,
            banner: '',
            namespace: null,
            rtl: false,
            ie: false,
        },
        options,
    )

    // Validate config.breakPoints
    if (config && config.breakPoints) {
        if (!_.isObject(config.breakPoints)) {
            throw new TypeError('`config.breakPoints` must be an Object')
        }

        /* istanbul ignore else  */
        if (_.size(config.breakPoints) > 0) {
            for (const bp in config.breakPoints) {
                if (!/^@media/.test(config.breakPoints[bp])) {
                    throw new Error('Breakpoint `' + bp + '` must start with `@media`.')
                } else {
                    breakPoints = config.breakPoints
                }
            }
        }
    }

    // Make sense of the config
    // eslint-disable-next-line prefer-const
    tree = this.parseConfig(config, options)

    // Write JSS
    // start by iterating rules (we need to follow the order that the rules were declared)
    this.rules.forEach(function (rule) {
        // Check if we have a class name that matches this rule
        if (tree[rule.matcher]) {
            tree[rule.matcher].forEach(function (treeo) {
                let breakPoint
                let selector

                // If we were not able to find the declaration then don't write anything
                if (!treeo.declarations) {
                    return
                }

                // eslint-disable-next-line prefer-const
                breakPoint = breakPoints && breakPoints[treeo.breakPoint]

                // This is where we start writing the selector
                selector = Atomizer.escapeSelector(treeo.className)

                // Handle parent classname
                if (treeo.parentSelector) {
                    selector = [
                        Atomizer.escapeSelector(treeo.parent),
                        Grammar.getPseudo(treeo.parentPseudo),
                        treeo.parentSep === '_'
                            ? ' '
                            : [' ', treeo.parentSep, ' '].join(''),
                        '.',
                        selector,
                    ].join('')
                }

                // Handle pseudo class in values
                if (treeo.valuePseudoClass) {
                    selector = [selector, Grammar.getPseudo(treeo.valuePseudoClass)].join(
                        '',
                    )
                }

                // Handle pseudo element in values
                if (treeo.valuePseudoElement) {
                    selector = [
                        selector,
                        Grammar.getPseudo(treeo.valuePseudoElement),
                    ].join('')
                }

                // Add the dot for the class
                selector = ['.', selector].join('')

                // Add the namespace only if we don't have a parent selector
                if (!treeo.parent) {
                    if (rule.type === 'helper' && options.helpersNamespace) {
                        selector = [options.helpersNamespace, ' ', selector].join('')
                    } else if (rule.type !== 'helper' && options.namespace) {
                        selector = [options.namespace, ' ', selector].join('')
                    }
                }

                // Rules are companion classes to the main atomic class
                if (rule.rules) {
                    _.merge(jss, rule.rules)
                }

                // Finaly, write the final parts
                // put the declaration to the JSS object with the associated class name
                /* istanbul ignore else */
                if (!jss[selector]) {
                    jss[selector] = {}
                }

                if (breakPoint) {
                    jss[selector][breakPoint] = treeo.declarations
                } else {
                    jss[selector] = treeo.declarations
                }
            })
        }
    })

    // Convert JSS to CSS
    content =
        options.banner +
        JSS.jssToCss(jss, {
            breakPoints: breakPoints,
        })

    // Fix the comma problem in Absurd
    content = Atomizer.replaceConstants(content, options.rtl)

    return content
}

/**
 * Escape CSS selectors with a backslash
 * e.g. '.W-100%' => '.W-100\%'
 */
Atomizer.escapeSelector = function (str /*: string */) /*: string */ {
    if (!str && str !== 0) {
        throw new TypeError('str must be present')
    }

    if (str.constructor !== String) {
        return str
    }

    // TODO: maybe find a better regex? (-?) is here because '-' is considered a word boundary
    // so we get it and put it back to the string.
    return str.replace(
        /\b(-?)([^-_a-zA-Z0-9\s]+)/g,
        function (str, dash, characters) {
            return (
                dash +
                characters
                    .split('')
                    .map(function (character) {
                        return ['\\', character].join('')
                    })
                    .join('')
            )
        },
    )
}

/**
 * Replace LTR/RTL placeholders with actual left/right strings
 */
Atomizer.replaceConstants = function (str /*: string */, rtl /*: boolean */) {
    const start = rtl ? 'right' : 'left'
    const end = rtl ? 'left' : 'right'

    if (!str || str.constructor !== String) {
        return str
    }

    return str.replace(/__START__/g, start).replace(/__END__/g, end)
}

module.exports = Atomizer
