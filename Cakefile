fs     = require 'fs'
path   = require 'path'
{exec} = require 'child_process'

build_dir   = 'build/'
src_dir     = 'src/'
externs_dir = path.join src_dir, 'externs'
lib_dir     = 'lib/'
test_dir    = 'test/'
tmp_dir     = '.tmp/'

option '-i', '--ios', 'set iOS-specific build for debug or compiled versions'
option '-d', '--debug', 'Compile with pretty print and debuggable variable names'

task 'compile', 'Compile files for production use', (options) ->
  taskCount = 2
  versionInfo  = null
  mustache_js  = null
  treesaver_js = null
  handler = ->
    if --taskCount == 0
      createDirs()
      filename = "treesaver-#{if options.ios then 'ios-' else ''}#{versionInfo.tag}.js"
      fs.writeFileSync path.join(build_dir, filename),
        mustache_js + treesaver_js
      console.log "#{filename} created"

      # Compilation done, report size
      invoke 'size'

  # Fetch version info
  getVersionInfo (info) ->
    versionInfo = info

    # Compile JS
    console.log 'Compiling...'
    getCompiledScript info, options, (js) ->
      treesaver_js = js
      handler()

  # Fetch JS dependencies
  getMustache true, (js) ->
    mustache_js = js
    handler()

task 'debug', 'Create debug build for testing', (options) ->
  mustache_js = null
  treesaver_js = null
  versionInfo = null
  taskCount = 3
  handler = ->
    if --taskCount == 0
      # Make sure directories exist
      createDirs()
      # Write out changes
      filename = "treesaver-#{versionInfo.tag}-debug.js"
      fs.writeFileSync (path.join build_dir, filename),
        mustache_js + treesaver_js
      console.log "#{filename} created"
      invoke 'size'

  # Fetch version info
  getVersionInfo (info) ->
    versionInfo = info
    handler()

  # Fetch JS dependencies
  getMustache false, (js) ->
    mustache_js = js
    handler()

  # Create the core JS
  console.log 'Combining JS sources'
  getDebugScript options, (js) ->
    treesaver_js = js
    handler()

task 'deps', 'Write out dependency file for running in non-compiled mode', ->
  files = fs.readdirSync(src_dir).map (f) -> path.join src_dir, f
  exec "python #{path.join lib_dir, 'closure/bin/calcdeps.py'}
    -i #{path.join src_dir, 'treesaver.js'}
    -p #{src_dir} -d #{path.join lib_dir, 'closure'}
    -o deps
    --output_file #{path.join test_dir, 'deps.js'}"

task 'size', 'Display file sizes', (options) ->
  # Nothing to do if no build directory
  return if not path.existsSync build_dir

  sizes = {}
  maxFileLength = 0
  maxSizeLength = 0
  # Left-pad strings
  lpad = (str, len) ->
    while str.length < len
      str = ' ' + str
    return str

  fs.readdirSync(build_dir).forEach (file) ->
    # Ignore non-JS files
    return if not /\.js$/.test(file)

    stats = fs.statSync(build_dir + file)
    sizes[file] = stats.size
    maxFileLength = Math.max maxFileLength, file.length 
    maxSizeLength = Math.max maxSizeLength, (String stats.size).length

  for file, size of sizes
    # Pad the strings for pretty output
    console.log "#{lpad file, maxFileLength}:  #{lpad (String size), maxSizeLength}"

task 'lint', 'Run Google\' style checker on source files', ->
  # Check if lint exists
  exec "which gjslint", (error, stdout, stderr) ->
    if error
      console.error "Please install closure linter:"
      console.error "http://code.google.com/closure/utilities/docs/linter_howto.html"
      return

    files = getFilesSync(src_dir, /\.js$/, /^externs$/)

    handleFile = ->
      return if files.length == 0
      file = files.shift()
      exec "gjslint #{file}", (error, stdout, stderr) ->
        if error
          console.error stderr
          console.error stdout
          console.error "#{files.length} files left to lint"
          return

        if stdout != ''
          console.log stdout

        # Recurse
        handleFile()

    # Kick off first file
    handleFile()

task 'fixlint', 'Run automatic lint fixer on all source files', ->
  # Check if lint exists
  exec "which fixjsstyle", (error, stdout, stderr) ->
    if error
      console.error "Please install closure linter:"
      console.error "http://code.google.com/closure/utilities/docs/linter_howto.html"
      return

    files = getFilesSync(src_dir, /\.js$/, /^externs$/)

    console.log "Fixing lint in #{files.length} files"
    handleFile = ->
      return if files.length == 0
      file = files.shift()
      exec "fixjsstyle #{file}", (error, stdout, stderr) ->
        if error
          console.error stderr if stderr != ''
          console.error stdout if stdout != ''
          console.error "#{files.length} files left to fix"
          return

        console.log stdout if stdout != ''

        if files.length
          console.log "#{files.length} files remaining"
          # Recurse
          handleFile()

    # Kick off first file
    handleFile()

task 'clean', 'Clean up the project directory', ->
  rmdirTreeSync(dir) for dir in [build_dir, tmp_dir]
  console.log 'Clean!'

###
Helpers
###

# Make directories necessary for build process
createDirs = ->
  [build_dir, tmp_dir].forEach (dir) ->
    try
      fs.mkdirSync dir, 0o0755
    catch error
      # Ignore

# Remove directory and its contents
rmdirTreeSync = (dir) ->
  return if not path.existsSync dir
  console.log "Removing: #{dir}"

  fs.readdirSync(dir).forEach (f) ->
    joined = path.join dir, f
    if fs.statSync(joined).isFile()
      fs.unlinkSync joined
    else
      rmdirTreeSync(joined)

  fs.rmdirSync dir

# Recursively fetch all files within a directory
getFilesSync = (dir, match, exclude) ->
  return [] if not path.existsSync dir

  files = []

  fs.readdirSync(dir).forEach (f) ->
    return if exclude and exclude.test f
    joined = path.join dir, f
    if fs.statSync(joined).isFile()
      if !match or match.test f
        files.push joined
    else
      child_files = (getFilesSync joined, match, exclude)
      files = files.concat child_files

  files

# Return the JS text of dependencies (currently just Mustache)
getMustache = (minify, callback) ->
  mustache_path = path.join lib_dir, 'mustache/mustache.js'

  if minify
    console.log "Minifying Mustache"
    exec "java -jar #{path.join lib_dir, 'closure/compiler.jar'}
          --compilation_level SIMPLE_OPTIMIZATIONS
          --js #{path.join lib_dir, 'mustache/mustache.js'}
          ", null, (error, stdout, stderr) ->
      if error
        console.error "Mustache failed to compile"
        console.error stderr
        throw error

      if stderr != ''
        console.log stderr

      callback stdout
  else
    callback fs.readFileSync mustache_path, 'utf-8' if not minify

# Get the list of dependency-sorted filenames
getDependencyList = (callback) ->
  exec "python #{path.join lib_dir, 'closure/bin/calcdeps.py'}
        -i #{path.join src_dir, 'treesaver.js'}
        -p #{src_dir}
        -p #{path.join lib_dir, 'closure'}
        -o list
        -c #{path.join lib_dir, 'closure/compiler.jar'}", null, (error, stdout, stderr) ->
    throw error if error
    callback stdout.split("\n").filter (f) -> f != ''

# Helper for getting version information from Git
getVersionInfo = (callback) ->
  retCount = 0
  info = []
  # Return once both shell tasks are complete
  handler = (propName, val) ->
    info[propName] = val
    callback info if ++retCount == 2

  exec 'git describe --abbrev=0', null, (error, stdout, stderr) ->
    if error
      console.error stderr
      throw error

    # Strip line ending
    handler 'tag', stdout.replace "\n", ""

  exec 'git describe --long --tags', null, (error, stdout, stderr) ->
    if error
      console.error stderr
      throw error

    # Strip line ending
    handler 'version', stdout.replace "\n", ""

# Concatenate script files
getDebugScript = (options, callback) ->
  exec "python #{path.join lib_dir, 'closure/bin/calcdeps.py'}
        -i #{path.join src_dir, 'treesaver.js'}
        -p #{src_dir}
        -p #{path.join lib_dir, 'closure'}
        -o script", { maxBuffer: 1000 * 1024 }, (error, stdout, stderr) ->

    if error
      console.log stderr
      throw error

    # Modify script to set constants correctly
    contents = stdout.replace 'COMPILED = false', 'COMPILED = true'

    if options.ios
      contents = contents.replace 'WITHIN_IOS_WRAPPER = false',
        'WITHIN_IOS_WRAPPER = true'

    callback contents

# Compile full version of code
getCompiledScript = (info, options, callback) ->
  # Standard options for ornery compilation
  args = "--compilation_level=ADVANCED_OPTIMIZATIONS
          --jscomp_error accessControls
          --jscomp_error checkRegExp
          --jscomp_error checkVars
          --jscomp_error deprecated
          --jscomp_error invalidCasts
          --jscomp_error missingProperties
          --jscomp_error undefinedVars
          --jscomp_error visibility
          --jscomp_warning fileoverviewTags
          --jscomp_warning nonStandardJsDocs
          --jscomp_warning strictModuleDepCheck
          --jscomp_warning unknownDefines
          --warning_level=VERBOSE
          --summary_detail_level=3
          --language_in ECMASCRIPT5_STRICT
          --define='COMPILED=true'
          --define='treesaver.VERSION=\"#{info.version}\"'
          --output_wrapper '(function(){%output%}).call(window);'
          "

  if options.ios
    args += " --define='WITHIN_IOS_WRAPPER=true'"

  if options.debug
    args += " --debug=true
              --formatting=PRETTY_PRINT
              --formatting=PRINT_INPUT_DELIMITER"
  else
    # Not sure why DEBUG isn't set to false by compiler, do it manually
    args += " --define='goog.DEBUG=false'"

  # Externs
  if path.existsSync externs_dir
    fs.readdirSync(externs_dir).forEach (f) ->
      args += " --externs=#{path.join externs_dir, f}"

  # Source files, in compilation order
  getDependencyList (fileList) ->
    args += " --js #{fileList.join ' --js '}"

    exec "java -jar #{path.join lib_dir, 'closure/compiler.jar'} #{args}", { maxBuffer: 1000 * 1024 }, (error, stdout, stderr) ->
      if error
        console.error stderr
        throw error

      # Output compilation message and return
      console.log stderr
      callback stdout
