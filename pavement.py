import os
import sys
import json
import shutil
from paver.easy import *
from paver.path import path

HOME_DIR = path(__file__).dirname().abspath()

options(
    home_dir = HOME_DIR,
    build_dir = HOME_DIR / 'build',
    src_dir = HOME_DIR / 'src',
    test_dir = HOME_DIR / 'test',
    lib_dir = HOME_DIR / 'lib',
    tmp_dir = HOME_DIR / '.tmp',
    closure_dir = HOME_DIR / 'lib/closure',
    closure_compiler = HOME_DIR / 'lib/closure/compiler.jar',
    closure_lint = 'gjslint',
    closure_fix_lint = 'fixjsstyle',
    tag = sh('git describe --abbrev=0', capture=True).replace('\n', ''),
    version =  sh('git describe --long --tags', capture=True).replace('\n', ''),
)

# Run options again to use variables from previous declaration
options(
    externs_dir = options.src_dir / 'externs',
    calcdeps = HOME_DIR / 'lib/closure/bin/calcdeps.py',
    depswriter = HOME_DIR / 'lib/closure/bin/build/depswriter.py',
)

# Closure compiler options
options(
    compiler_errors = [
        '', # First one blank for join()
        'accessControls',
        'checkRegExp',
        'checkTypes',
        'checkVars',
        'deprecated',
        'fileoverviewTags',
        'invalidCasts',
        'missingProperties',
        'undefinedVars',
        'visibility'
    ],
    compiler_warnings = [
        '', # First one blank for join()
        'nonStandardJsDocs',
        'strictModuleDepCheck',
        'unknownDefines',
    ],
    compiler_flags = [
        '--warning_level=VERBOSE',
        '--summary_detail_level=3',
    ]
)

def check_requirements():
    """Make sure all system requirements are met"""
    if not options.closure_compiler.isfile():
        raise BuildFailure("Closure compiler not found")

# Run requirements test no matter what
check_requirements()

@task
def clean():
    """Cleans up the project directory"""
    options.build_dir.rmtree()
    options.tmp_dir.rmtree()

@task
@consume_args
def default(args = []):
    """Write out dependency file in order to test non-compiled scripts"""
    js_files = options.src_dir.files('*.js')

    output_mode = 'deps'

    sh('python %s -i %s -p %s -d %s -o %s --output_file %s' % (
        options.calcdeps,
        ' -i '.join(js_files),
        options.src_dir,
        options.closure_dir,
        output_mode,
        options.test_dir / 'deps.js'
    ))

@task
@consume_args
def debug(args):
    """Create debug versions for testing"""
    output_mode = 'script'
    is_ios = '--ios' in args

    if not options.build_dir.isdir():
        options.build_dir.makedirs()

    outfile = options.build_dir / 'treesaver.js'
    js = sh('python %s -i %s -p % s -p %s -o %s --output_file %s' % (
        options.calcdeps,
        ' -i'.join(options.src_dir.files('*.js')),
        options.src_dir,
        options.closure_dir,
        output_mode,
        outfile
    ), capture=True)

    # Need to modify the output in order to set COMPILED to true, since
    # this normally happens via the compiler
    contents = outfile.text().replace('COMPILED = false', 'COMPILED = true', 1)

    if is_ios:
        contents = contents.replace('SUPPORT_IE = true', 'SUPPORT_IE = false', 1)
        contents = contents.replace('SUPPORT_LEGACY = true', 'SUPPORT_LEGACY = false', 1)
        contents = contents.replace('WITHIN_IOS_WRAPPER = false', 'WITHIN_IOS_WRAPPER = true', 1)

    outfile.write_text(contents)

    prepend_lib(options.lib_dir / 'mustache/mustache.js', outfile, False)

@task
@consume_args
def lint(args):
    """Run Google's style checker on source files"""
    if not options.tmp_dir.isdir():
        options.tmp_dir.makedirs()

    last_run = None
    lint_flag = options.tmp_dir / 'lint'
    if lint_flag.exists():
        last_run = (options.tmp_dir / 'lint').mtime

    for file in options.src_dir.walkfiles('*.js'):
        # Skip extern files
        if file.parent == options.externs_dir:
            continue

        if '--force' in args or not last_run or (last_run < file.mtime):
            sh('%s %s' % (
                options.closure_lint,
                file
            ))

    # Only update the lint flag on success
    lint_flag.touch()

@task
def fix_lint():
    """Run Closure lint fixer on all source files"""
    for file in options.src_dir.walkfiles('*.js'):
        sh('%s %s' % (
            options.closure_fix_lint,
            file
        ))

def get_dependency_list(js_files):
    """Returns list of dependency filenames in compilation order"""
    list = sh('python %s -i %s -p % s -p %s -o list -c %s' % (
        options.calcdeps,
        ' -i '.join(js_files),
        options.src_dir,
        options.closure_dir,
        options.closure_compiler,
    ), capture=True)

    # Remove duplicate lines
    found = set()
    files = []
    for line in list.splitlines():
        # Only want filenames, ignore the other stuff in output
        if not line or line[0] != '/' or line in found:
            continue
        found.add(line)
        files.append(line)

    return files

@task
@consume_args
def compile(args):
    """Compile and minimize files using Closure Compiler"""
    if not options.build_dir.isdir():
        options.build_dir.makedirs()

    filename = 'treesaver-%s.js' % options.tag

    compiler_flags = [
        '--compilation_level=ADVANCED_OPTIMIZATIONS',
        ' --jscomp_error '.join(options.compiler_errors),
        ' --jscomp_warning '.join(options.compiler_warnings),
        # Don't leak global variables
        """--output_wrapper '(function(){%output%}).call(window);'""",
        # Not sure why compiler doesn't do this automatically
        '--define="COMPILED=true"',

        '--language_in ECMASCRIPT5_STRICT',

        '--define="treesaver.VERSION=\'%s\'"' % options.version
    ]

    if ('--nolegacy' in args):
        compiler_flags.append('--define="SUPPORT_LEGACY=false"')

    if ('--noie' in args):
        compiler_flags.append('--define="SUPPORT_IE=false"')

    if ('--ios' in args):
        compiler_flags.append('--define="SUPPORT_IE=false"')
        compiler_flags.append('--define="SUPPORT_LEGACY=false"')
        compiler_flags.append('--define="WITHIN_IOS_WRAPPER=true"')
        filename = 'treesaver-ios-%s.js' % options.tag

    # Make pretty output for debug mode
    if '--debug' in args:
        compiler_flags.append('--debug=true')
        compiler_flags.append('--formatting=PRETTY_PRINT')
        compiler_flags.append('--formatting=PRINT_INPUT_DELIMITER')
    else:
        # Let code know modules are not being used
        # Not sure why this doesn't happen by default
        compiler_flags.append('--define="goog.DEBUG=false"')

    # Externs definitions
    if options.externs_dir.isdir():
        for extern in options.externs_dir.files('*.js'):
            compiler_flags.append('--externs=%s' % extern)

    js_files = options.src_dir.files('*.js')

    file_list = get_dependency_list(js_files)
    compiler_flags.append('--js %s' % ' --js '.join(file_list))
    compiler_flags.append('--js_output_file=%s' % (options.build_dir / filename))

    # Run the compilation
    sh('java -jar %s %s' % (
        options.closure_compiler,
        ' '.join(compiler_flags),
    ))

    # Add our dependencies
    prepend_lib(options.lib_dir / 'mustache/mustache.js', options.build_dir / filename)

    size()

def prepend_lib(source_file, target_file, minify = True):
    """Minify (using SIMPLE_OPTIMIZATIONS) and prepend source_file to target_file."""

    tmp_source = options.build_dir / path.basename(source_file)
    tmp_name = "%s.tmp" % target_file

    if minify:
      sh('java -jar %s %s' % (
          options.closure_compiler,
          ' --compilation_level SIMPLE_OPTIMIZATIONS --js %s --js_output_file=%s' % (source_file, tmp_source)
      ))
    else:
      shutil.copy(source_file, tmp_source)

    sh('mv %s %s && mv %s %s && cat %s >> %s && rm %s' % (
      target_file,
      tmp_name,

      tmp_source,
      target_file,

      tmp_name,
      target_file,

      tmp_name
  ))

@task
def size():
    """Display the size of compiled files"""
    sizes = {}
    max_name_width = 0
    max_size_width = 0
    for js_file in options.build_dir.files('*.js'):
        name, size = js_file.basename(), js_file.size
        sizes[name] = size
        max_name_width = max(max_name_width, len(name))
        max_size_width = max(max_size_width, len(str(size)))

    format_string = ' %%%gs:  %%%gg bytes' % (max_name_width, max_size_width)
    items = sizes.items()
    items.sort()
    for name, size in items:
        print(format_string % (name, size))
