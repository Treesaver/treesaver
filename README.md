# Treesaver

[Treesaver](http://www.treesaverjs.com) is JavaScript framework for creating magazine-style layouts using standards-compliant HTML and CSS.

## Getting Started / Documentation

The [Treesaver wiki](http://github.com/treesaver/treesaver/wiki) is the best source of documentation and reference. Note that the documentation is still a work in progress.

## Support/Questions

Use the [Treesaver.js Mailing List](http://groups.google.com/group/treesaverjs).

## Building Treesaver

Use the instructions below if you wish to build Treesaver from scratch. *Most people are better off [downloading a pre-built version](http://github.com/treesaver/treesaver/downloads)*.

### Dependencies

* [Paver](http://www.blueskyonmars.com/projects/paver/): For running build script. Requires Python.
* [Closure Linter](http://code.google.com/closure/utilities/docs/linter_howto.html): Check and fix coding style. (optional)

### Setup Instructions

1. Make sure to install all the dependencies
2. Clone a copy of the Treesaver repo by running: `git clone git://github.com/treesaver/treesaver.git`

### Commands

Note that these commands *must* be run from the root directory of the repository.

* `paver`: Create dependency script for testing
* `paver compile`: Compile JavaScript files for production. Can be used with one or more compilation flags:
  * `--modules`: Compile into modules for async loading (compiles into two separate files)
  * `--debug`: Use debug-friendly minification
  * `--ios`: Compile version for use within an IOS `UIWebView`
  * `--noie`: Compile without IE support
  * `--nolegacy`: Compile without support for legacy browsers (IE7, mostly)
* `paver debug`: Concatenate files for use when debugging (preserves comments, formatting, etc). Supports the following compilation flags:
  * `--ios`: Compile version for use within an IOS `UIWebView`
  * `--modules`: Compile into modules for async loading (compiles into two separate files)
* `paver clean`: remove build artifacts
* `paver lint`: Check style with lint
* `paver fix_lint`: Automatically fix lint errors

## License

Dual-licensed under MIT and GPLv2

## Contributing

### Coding Style

Yes, the code looks verbose and kind of like Java. That is because it follows the Google Closure style. This is in order to get better compression via the Closure Compiler. [UglifyJS](http://github.com/mishoo/UglifyJS) shows a lot of potential, and merits investigation.

Although Google Closure style and compiler are used, note that Treesaver does *not* use the [Closure Library](http://code.google.com/closure/library/).

### Contributors

* [Filipe Fortes](http://www.fortes.com/) [@fortes](http://twitter.com/fortes)
* [Bram Stein](http://www.bramstein.com/) [@bram_stein](http://twitter.com/bram_stein)
