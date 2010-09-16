# Dependencies

* [Paver](http://www.blueskyonmars.com/projects/paver/): For running build script. Requires Python.
* [Closure Compiler](http://code.google.com/closure/compiler/): Aggregates and minifies JavaScript.
* [Closure Library](http://code.google.com/closure/library/): Required for best use of Closure Compiler.
* [Closure Linter](http://code.google.com/closure/utilities/docs/linter_howto.html): Check and fix coding style.

# Setup Instructions

1. Make sure to install all the dependencies
2. Edit the `pavement.py` file and make sure to set up the correct path for the Closure Compiler and Library

# Commands

* `paver`: Create dependency script for testing
* `paver compile`: Compile JavaScript files for production
  * `paver compile --debug`: Use debug-friend minification
  * `paver compile --single`: Compile into a single JavaScript file
* `paver lint`: Check style with lint
* `paver fix_lint`: Automatically fix lint errors
