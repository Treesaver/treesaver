import os
import sys
import json
from paver.easy import *
from paver.path import path
from hashlib import md5

HOME_DIR = path(__file__).dirname().abspath()

options(
    home_dir = HOME_DIR,
    build_dir = HOME_DIR / 'build',
    src_dir = HOME_DIR / 'src',
    test_dir = HOME_DIR / 'test',
    tmp_dir = HOME_DIR / '.tmp',
    closure_dir = HOME_DIR / 'closure',
    closure_compiler = HOME_DIR / 'closure/compiler.jar',
    closure_lint = 'gjslint',
    closure_fix_lint = 'fixjsstyle',
    tag = sh('git describe --abbrev=0', capture=True).replace('\n', ''),
    version =  sh('git describe --long --tags', capture=True).replace('\n', ''),
)

# Run options again to use variables from previous declaration
options(
    modules_file = options.src_dir / 'modules.json',
    externs_dir = options.src_dir / 'externs',
    calcdeps = HOME_DIR / 'closure/bin/calcdeps.py',
    depswriter = HOME_DIR / 'closure/bin/build/depswriter.py',
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

    if not options.modules_file.isfile():
        raise BuildFailure("modules.json not found")

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

    write_module_file()

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
    is_single = '--modules' not in args

    if not options.build_dir.isdir():
        options.build_dir.makedirs()

    if is_single:
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
        contents = contents.replace('USE_MODULES = true', 'USE_MODULES = false', 1)

        if is_ios:
            contents = contents.replace('SUPPORT_IE = true', 'SUPPORT_IE = false', 1)
            contents = contents.replace('SUPPORT_LEGACY = true', 'SUPPORT_LEGACY = false', 1)
            contents = contents.replace('WITHIN_IOS_WRAPPER = false', 'WITHIN_IOS_WRAPPER = true', 1)

        outfile.write_text(contents)

    else:
        for jsfile in options.src_dir.files('*.js'):
            outfile = options.build_dir / jsfile.basename()
            js = sh('python %s -i %s -p % s -p %s -o %s --output_file %s' % (
                options.calcdeps,
                jsfile,
                options.src_dir,
                options.closure_dir,
                output_mode,
                outfile
            ), capture=True)

            # Need to modify the output in order to set COMPILED to true, since
            # this normally happens via the compiler
            contents = outfile.text().replace('COMPILED = false', 'COMPILED = true', 1)

            outfile.write_text(contents)

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

def write_module_file():
    """Writes a module file that can be referenced by the application code"""
    modules = json.loads(open(options.modules_file).read())

    outfile = open(options.src_dir / 'modules.js', "w")
    outfile.writelines("// This file is generated. Do not modify.\n\
goog.provide('treesaver.modules');\n\
\n\
treesaver.modules = {\n\
%s\n\
};\n\
/**\n\
 * Returns a filename given a module name. The filename is\n\
 * dependant on whether the application is compiled.\n\
 *\n\
 * @param {!string} name Module name to look up a filename for.\n\
 * @return {!string} File name to load for the given module.\n\
 */\n\
treesaver.modules.get = function (name) {\n\
  return treesaver.modules[name][COMPILED ? 'target' : 'src'];\n\
};" % (
      ',\n'.join(['  "%s": { target: "%s-%s.js", src: "%s" }' % (module['name'], module['name'], options.tag, module['src']) for module in modules])
    ))
    outfile.close()

@task
@consume_args
def compile(args):
    """Compile and minimize files using Closure Compiler"""
    if not options.build_dir.isdir():
        options.build_dir.makedirs()

    write_module_file()

    # Whether we should compile to a single file instead of modules
    is_single = '--modules' not in args

    single_filename = 'treesaver-%s.js' % options.tag

    compiler_flags = [
        '--compilation_level=ADVANCED_OPTIMIZATIONS',
        ' --jscomp_error '.join(options.compiler_errors),
        ' --jscomp_warning '.join(options.compiler_warnings),
        # Don't leak global variables
        """--output_wrapper '(function(){%output%}());'""",
        # Not sure why compiler doesn't do this automatically
        '--define="COMPILED=true"',

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
        is_single = True
        single_filename = 'treesaver-ios-%s.js' % options.tag

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

    # Compile into a single file or modules?
    if is_single:
        file_list = get_dependency_list(js_files)
        compiler_flags.append('--js %s' % ' --js '.join(file_list))
        compiler_flags.append('--js_output_file=%s' % (options.build_dir / single_filename))

        # Let code know modules are not being used
        compiler_flags.append('--define="USE_MODULES=false"')
    else:
        # Calculate the module info
        modules = json.loads(open(options.modules_file).read())
        # TODO: Refactor and make this sane. Do a topological sort on dependency
        # graph so it doesn't have to be manually specified
        file_list = []
        file_counts = []
        for module in modules:
            file_count = 0
            deps = get_dependency_list([options.src_dir / module['src']])
            # Cannot include a file more than once
            for dep in deps:
                if dep not in file_list:
                    file_list.append(dep)
                    file_count += 1
            file_counts.append(file_count)

        compiler_flags.append('--module_output_path_prefix %s' % (options.build_dir / ''))
        compiler_flags.append('--js %s' % ' --js '.join(file_list))
        for i, module in enumerate(modules):
            dependencies = ''
            if len(module['dependencies']):
                # We refer to modules by "treesaver_%s" where %s is an md5 hash of the module
                # name. This is very ugly but it is a work-around for Closure Compiler's
                # restrictions on module names. We rename the resulting files back once Closure
                # has done its job.
                dependencies = ':%s' % ','.join(["treesaver_%s" % md5(dependency).hexdigest() for dependency in module['dependencies']])

            compiler_flags.append('--module treesaver_%s:%s%s' % (
                md5(module['name']).hexdigest(),
                file_counts[i],
                dependencies
            ))

    # Run the compilation
    sh('java -jar %s %s' % (
        options.closure_compiler,
        ' '.join(compiler_flags),
    ))

    if not is_single:
      for i, module in enumerate(modules):
        target_name = "%s-%s.js" % (module['name'], options.tag)

        target_file = options.build_dir / target_name
        js_file = options.build_dir / "treesaver_%s.js" % md5(module['name']).hexdigest()

        os.rename(js_file, target_file)

        contents = target_file.text()

    size()

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
