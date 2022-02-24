'use strict'

const Generator = require('yeoman-generator')
const chalk = require('chalk')
const yosay = require('yosay')
const path = require('path')
const shelljs = require('shelljs')
const mkdir = require('mkdirp')

const dependencies = require('./dependencies')

class CreaWSP extends Generator {
    constructor() {
        super(...arguments)

        this.proc = {}
        this.package = {}
    }

    async prompting() {
        // Have Yeoman greet the user.
        this.log(yosay(`Welcome to the world-class ${chalk.yellow('Creawave Studio`s')} generator!`))
        this.log(chalk.green(' Initializing package.json file.'))

        let opts

        // Ask for some questions
        const prompts = [
            {
                type: 'input', name: 'name', message: 'Enter your project name:', default: path.basename(process.cwd()),
                validate: (input) => input.trim() !== '',
            }, {
                type: 'input', name: 'version', message: 'Enter Node versions (comma separated):', default: '0.0.1',
            }, {
                type: 'input', name: 'description', message: 'Description:', default: 'Front-End Builder',
            }, {
                type: 'input', name: 'homepage', message: 'Project homepage url:',
            }, {
                type: 'input', name: 'author_name', message: 'Author`s Name:', default: shelljs
                    .exec('git config user.name', {
                        silent: true,
                    })
                    .replace(/\n/g, '') || '',
            }, {
                type: 'input', name: 'author_email', message: 'Author`s Email:', default: shelljs
                    .exec('git config user.email', {
                        silent: true,
                    })
                    .replace(/\n/g, '') || '',
            }, {
                type: 'input', name: 'author_homepage', message: 'Author`s Homepage:', default: shelljs
                    .exec('git config github.user', {
                        silent: true,
                    })
                    .replace(/\n/g, '') || '',
            }, {
                type: 'list', name: 'license', message: 'Which license do you want to use?:', choices: [
                    'Apache 2.0', 'MIT', 'Mozilla Public License 2.0', 'BSD 2-Clause (FreeBSD) License',
                    'BSD 3-Clause (NewBSD) License', 'Internet Systems Consortium (ISC) License', 'GNU AGPL 3.0', 'GNU GPL 3.0',
                    'GNU LGPL 3.0',
                ],
            },
        ]

        // Confirm
        const confirmation = [
            {
                type: 'confirm',
                name: 'confirmed',
                message: JSON.stringify(opts, null, 2) + '\n\nIs this OK?',
                default: true,
            },
        ]

        while (1) {
            let props = await this.prompt(prompts)
            let {confirmed} = await this.prompt(confirmation)

            opts = initOptsJSON(props)

            if (confirmed) {
                opts = {
                    ...opts, ...dependencies,
                }

                this.package = opts
                break
            }
        }
    }

    async promptingSecond() {
        this.log(chalk.green('\n Choose the preprocessors that you are using.'))

        const _processors = [
            {
                type: 'list', name: 'html', message: 'HTML preprocessors:', choices: ['pug', 'html'],
            }, {
                type: 'list', name: 'js', message: 'JavaScript preprocessors:', choices: [
                    {
                        name: 'babel', value: 'js',
                    }, {
                        name: 'typescript', value: 'ts',
                    },
                ],
            }, {
                type: 'input', name: 'PORT', message: 'Enter the port:', default: 3000,
            },
        ]

        this.proc = await this.prompt(_processors)
        this.package.devDependencies['gulp-sass'] = '^4.1.0'

        if (this.proc.html !== 'html') this.package.devDependencies[`gulp-${this.proc.html}`] = '^4.0.1'
        if (this.proc.js === 'js') {
            const babel = require('./dependencies/babel')

            this.package.babel = babel.babel
            this.package.devDependencies = {
                ...this.package.devDependencies, ...babel.devDependencies,
            }
        } else {
            this.package.devDependencies.typescript = '^4.1.3'
            this.package.devDependencies['gulp-typescript'] = '^6.0.0-alpha.1'
        }

        this.choice = this.proc
        return this.package
    }

    // Copying files
    async writing() {
        // Paths for gulp`s tasks
        const tasks = [
            `'./gulp/tasks/code/${this.choice.js}'`, `'./gulp/tasks/code/${this.choice.html}'`,
            `'./gulp/tasks/code/sass'`, `./gulp/tasks/other/acss'`, `./gulp/tasks/other/critical'`,
            `'./gulp/tasks/images/img'`, `./gulp/tasks/server/serve'`, `./gulp/tasks/server/compile'`,
            `./gulp/tasks/server/watch'`, `'./gulp/tasks/images/misc'`, `'./gulp/tasks/other/uncss'`,
        ]

        // Configuration
        this.fs.copy(this.templatePath('gulpfile.js'), this.destinationPath('gulpfile.js'))
        this.fs.copy(this.templatePath('gulp/config/postcss/index.js'), this.destinationPath('gulp/config/postcss/index.js'))
        this.fs.copy(this.templatePath('gulp/config/atomizer/**/*.js'), this.destinationPath('gulp/config/atomizer/'))
        this.fs.copy(this.templatePath('gulp/config/media/index.js'), this.destinationPath('gulp/config/media/index.js'))
        this.fs.copy(this.templatePath('gulp/config/media/config.json'), this.destinationPath('gulp/config/media/config.json'))
        this.fs.copy(this.templatePath('gulp/config/extractMediaQuery/index.js'), this.destinationPath('gulp/config/extractMediaQuery/index.js'))
        this.fs.copy(this.templatePath('gulp/config/config.json'), this.destinationPath('gulp/config/config.json'), {
            process: (content) => {
                const new_content = JSON.parse(content)

                new_content.cfg.srv.port1 = isNaN(Number(this.proc.PORT)) ? Number(this.proc.PORT) : 3000
                new_content.cfg.srv.port2 = isNaN(Number(this.proc.PORT)) ? 1 + Number(this.proc.PORT) : 3001

                new_content.paths.html.src = `src/${this.choice.html}/**/!(_)*.${this.choice.html}`
                new_content.paths.html.watch = `src/${this.choice.html}/**/*.${this.choice.html}`
                new_content.paths.javascript.src = `src/${this.choice.js}/**/*.${this.choice.js}`

                return JSON.stringify(new_content, null, 3)
            },
        })

        this.fs.copy(this.templatePath('gulp/config/constants/proc.json'), this.destinationPath('gulp/config/constants/proc.json'), {
            process: () => JSON.stringify(this.proc, null, 3),
        })

        // Copying tasks
        this.fs.copy(this.templatePath('gulp/tasks/server/compile.js'), this.destinationPath('gulp/tasks/server/compile.js'))
        this.fs.copy(this.templatePath('gulp/tasks/server/serve.js'), this.destinationPath('gulp/tasks/server/serve.js'))
        this.fs.copy(this.templatePath('gulp/tasks/server/watch.js'), this.destinationPath('gulp/tasks/server/watch.js'))

        this.fs.copy(this.templatePath('gulp/tasks/images/misc.js'), this.destinationPath('gulp/tasks/images/misc.js'))
        this.fs.copy(this.templatePath('gulp/tasks/images/img.js'), this.destinationPath('gulp/tasks/images/img.js'))

        this.fs.copy(this.templatePath('gulp/tasks/other/uncss.js'), this.destinationPath('gulp/tasks/other/uncss.js'))
        this.fs.copy(this.templatePath('gulp/tasks/other/acss.js'), this.destinationPath('gulp/tasks/other/acss.js'))
        this.fs.copy(this.templatePath('gulp/tasks/other/critical.js'), this.destinationPath('gulp/tasks/other/critical.js'))

        this.fs.copy(this.templatePath('gulp/tasks/code/css.js'), this.destinationPath('gulp/tasks/code/sass.js'))
        this.fs.copy(this.templatePath('gulp/tasks/code/html.js'), this.destinationPath(`gulp/tasks/code/${this.choice.html}.js`))
        this.fs.copy(this.templatePath('gulp/tasks/code/js.js'), this.destinationPath(`gulp/tasks/code/${this.choice.js}.js`))

        // Copying to /src/
        this.fs.copy(this.templatePath('src/sass/**/*.{scss, sass}'), this.destinationPath('src/sass/'))
        // this.fs.copy(this.templatePath('src/templates/*.mustache'), this.destinationPath('src/templates/'))
        this.fs.copy(this.templatePath(`src/${this.choice.html}/**/*.${this.choice.html}`), this.destinationPath(`src/${this.choice.html}/`))
        this.fs.copy(this.templatePath(`src/${this.choice.js}/**/*.${this.choice.js}`), this.destinationPath(`src/${this.choice.js}/`))

        // Rest files
        this.fs.copy(this.templatePath('.eslintrc'), this.destinationPath('.eslintrc'))
        this.fs.copy(this.templatePath('gitignore'), this.destinationPath('.gitignore'))
        this.fs.copy(this.templatePath('.travis.yml'), this.destinationPath('.travis.yml'))
        this.fs.copy(this.templatePath('gulp/config/constants/index.js'), this.destinationPath('gulp/config/constants/index.js'))
        this.fs.write(this.destinationPath('gulp/config/tasks.js'), `module.exports=[${tasks.toString()}]`)
        this.fs.writeJSON(this.destinationPath('package.json'), this.package)
    }

    // Creating directories
    async scaffoldFolders() {
        mkdir('markup')
        mkdir('markup/dist')
        mkdir('markup/dist/css')
        mkdir('markup/dist/img')
        mkdir('markup/dist/js')
        mkdir('markup/dist/fonts')


        if (this.choice.html === 'pug')
            mkdir('src/pug/_helpers/')
    }

    // Installing dependecies
    async install() {
        this.installDependencies({
            npm: false, yarn: true, bower: false, skipInstall: false,
        })
    }
}

function initOptsJSON(props) {
    if (props.author_name.trim() !== '' || props.author_email.trim() !== '' || props.author_homepage.trim() !== '') {
        props.author = {
            name: props.author_name, email: props.author_email, url: props.author_homepage,
        }

        delete props.author_name
        delete props.author_email
        delete props.author_homepage
    } else {
        props.author = 'Reforge.digital'
    }

    return props
}

module.exports = CreaWSP
