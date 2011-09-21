/**
 * @fileoverview Basic task scheduling.
 *
 */

goog.provide('treesaver.scheduler');

goog.require('treesaver.array');
goog.require('treesaver.debug');

goog.scope(function() {
  var scheduler = treesaver.scheduler,
      debug = treesaver.debug,
      array = treesaver.array;

  /**
   * Milliseconds between checks for task execution
   *
   * @const
   * @type {number}
   */
  scheduler.TASK_INTERVAL = 17; // ~60 fps

  /**
   * Array of all tasks
   *
   * @private
   * @type {!Array}
   */
  scheduler.tasks_ = [];

  /**
   * Map of named tasks
   *
   * @private
   * @type {Object}
   */
  scheduler.namedTasks_ = {};

  /**
   * If set, suspends all tasks except the ones named in this array
   *
   * @private
   * @type {Array.<string>}
   */
  scheduler.taskWhitelist_ = null;

  /**
   * ID of the scheduler tick task
   *
   * @private
   */
  scheduler.tickID_ = -1;

  /**
   * ID of the pausing task
   *
   * @private
   */
  scheduler.pauseTimeoutId_ = -1;

  /**
   * Based on Paul Irish's requestAnimationFrame
   *
   * @private
   */
  scheduler.requestAnimationFrameFunction_ = function() {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback, element) {
        return window.setTimeout(callback, scheduler.TASK_INTERVAL);
      }
  }();

  /**
   * @private
   */
  scheduler.requestAnimationFrame_ = function(f, el) {
    return scheduler.requestAnimationFrameFunction_.call(window, f, el);
  };

  /**
   * @private
   */
  scheduler.cancelAnimationFrameFunction_ = function() {
    return window.cancelAnimationFrame ||
      window.webkitCancelRequestAnimationFrame ||
      window.mozCancelRequestAnimationFrame ||
      window.oCancelRequestAnimationFrame ||
      window.msCancelRequestAnimationFrame ||
      window.clearTimeout;
  }();

  /**
   * @private
   */
  scheduler.cancelAnimationFrame_ = function(id) {
    return scheduler.cancelAnimationFrameFunction_.call(window, id);
  };

  /**
   * Master callback for task execution
   * @private
   */
  scheduler.tick_ = function() {
    var now = goog.now();

    scheduler.tasks_.forEach(function(task, i) {
      // If the tick function is no longer on interval, prevent all task
      // execution
      if (scheduler.tickID_ === -1) {
        return;
      }

      // Was the task removed? If so, skip execution
      if (task.removed) {
        return;
      }

      // Is the whitelist active?
      if (scheduler.taskWhitelist_) {
        if (!task.name ||
          scheduler.taskWhitelist_.indexOf(task.name) === -1) {
          // Task is not on whitelist, go to next
          return;
        }
      }

      // Is it time to run the task yet?
      if ((now - task.last) <= task.interval) {
        return;
      }

      task.last = now;
      task.times -= 1;

      if (task.times <= 0) {
        // Immediate functions stay on the queue one extra time, meaning
        // they only get removed when their times count is -1
        if (!task.immediate || task.times < 0) {
          // Remove from registries
          array.remove(treesaver.scheduler.tasks_, i);
          delete scheduler.namedTasks_[task.name];

          // Exit early in order to make sure we don't execute an extra time
          if (task.immediate) {
            return;
          }
        }
      }

      if (goog.DEBUG) {
        try {
          task.fun.apply(task.obj, task.args);
        }
        catch (ex) {
          debug.error('Task ' + (task.name || 'untitled') + ' threw: ' + ex);
        }
      }
      else {
        task.fun.apply(task.obj, task.args);
      }
    });

    // Clear out previous id
    scheduler.tickID_ = -1;

    // Don't do anything if no tasks waiting
    if (scheduler.tasks_.length) {
      scheduler.start_();
    }
  };

  /**
   * Helper function for adding tasks to the execution queue
   *
   * @private
   * @param {!function()} fun
   * @param {!number}     interval
   * @param {number=}     times
   * @param {Array=}      args
   * @param {boolean=}    immediate
   * @param {string=}     name
   * @param {Object=}     obj
   */
  scheduler.addTask_ = function(fun, interval, times, args, immediate, name, obj) {
    if (goog.DEBUG) {
      if (!'apply' in fun) {
        debug.error('Function without apply() not added to the scheduler');
        return;
      }
    }

    var now = goog.now(),
        task = name ? scheduler.namedTasks_[name] : null;

    // Re-use previous task if it exists
    if (name && name in scheduler.namedTasks_) {
      task = scheduler.namedTasks_[name];
    }
    else {
      // Create a new task object
      task = {
        fun: fun,
        name: name,
        obj: obj,
        last: immediate ? -Infinity : now
      };

      // Store
      scheduler.tasks_.push(task);
      if (name) {
        scheduler.namedTasks_[name] = task;
      }
    }

    task.args = args || [];
    task.times = times;
    task.interval = interval;
    task.immediate = immediate;
    task.removed = false;

    // Restart the tick callback if it's not active
    scheduler.start_();
  };

  /**
   * Run a function once after a delay
   *
   * @param {!function()} fun
   * @param {!number}     delay
   * @param {Array=}      args
   * @param {string=}     name
   * @param {Object=}     obj
   */
  scheduler.delay = function(fun, delay, args, name, obj) {
    scheduler.addTask_(fun, delay, 1, args, false, name, obj);
  };

  /**
   * Run a function on a repeating interval
   * @param {!function()} fun
   * @param {!number}     interval
   * @param {number=}     times
   * @param {Array=}      args
   * @param {string=}     name
   * @param {Object=}     obj
   */
  scheduler.repeat = function(fun, interval, times, args, name, obj) {
    scheduler.addTask_(fun, interval, times, args, false, name, obj);
  };

  /**
   * Add a function to the execution queue
   * @param {!function()} fun
   * @param {Array=}      args
   * @param {string=}     name
   * @param {Object=}     obj
   */
  scheduler.queue = function(fun, args, name, obj) {
    scheduler.addTask_(fun, 0, 1, args, false, name, obj);
  };

  /**
   * Debounce a function call, coalescing frequent function calls into one
   *
   * @param {!function()} fun
   * @param {!number}     interval
   * @param {Array=}      args
   * @param {boolean=}    immediate
   * @param {string=}     name
   * @param {Object=}     obj
   */
  scheduler.debounce =
    function(fun, interval, args, immediate, name, obj) {
    // Check if the task already exists
    var task = scheduler.namedTasks_[name];

    if (task) {
      // Update timestamp to further delay execution
      task.last = goog.now();
    }
    else {
      scheduler.addTask_(fun, interval, 1, args, immediate, name, obj);
    }
  };

  /**
   * Limit the frequency of calls to the a given task
   *
   * @param {!function()} fun
   * @param {!number}     interval
   * @param {Array=}      args
   * @param {string=}     name
   * @param {Object=}     obj
   */
  scheduler.limit = function(fun, interval, args, name, obj) {
    // Check if the task already exists
    var task = scheduler.namedTasks_[name];

    // Ignore if already in the queue
    if (!task) {
      scheduler.addTask_(fun, interval, 1, args, true, name, obj);
    }
  };

  /**
   * Pause all tasks except those named in the whitelist
   *
   * @param {Array.<string>} whitelist Names of tasks that can still execute.
   * @param {number=} timeout Timeout before auto-resume.
   */
  scheduler.pause = function(whitelist, timeout) {
    scheduler.taskWhitelist_ = whitelist;

    // Clear previous if there
    if (scheduler.pauseTimeoutId_ !== -1) {
      window.clearTimeout(scheduler.pauseTimeoutId_);
    }

    if (timeout) {
      scheduler.pauseTimeoutId_ = setTimeout(scheduler.resume, timeout);
    }
  };

  /**
   * Resume task execution
   */
  scheduler.resume = function() {
    scheduler.taskWhitelist_ = null;
    if (scheduler.pauseTimeoutId_ !== -1) {
      window.clearTimeout(scheduler.pauseTimeoutId_);
      scheduler.pauseTimeoutId_ = -1;
    }
  };

  /**
   * Remove a task from the execution queue
   * @param {!string} name Task name.
   */
  scheduler.clear = function(name) {
    delete scheduler.namedTasks_[name];

    scheduler.tasks_.forEach(function(task, i) {
      if (task.name === name) {
        array.remove(treesaver.scheduler.tasks_, i);
        // Mark task as inactive, in case there are any references left
        task.removed = true;
      }
    });
  };

  /**
   * Start function processing again
   * @private
   */
  scheduler.start_ = function() {
    if (scheduler.tickID_ === -1) {
      scheduler.tickID_ = treesaver.scheduler.requestAnimationFrame_(
        scheduler.tick_,
        document.body
      );
    }
  };

  /**
   * Stop all functions from being executed, and clear out the queue
   */
  scheduler.stopAll = function() {
    // Stop task
    if (scheduler.tickID_) {
      scheduler.cancelAnimationFrame_(treesaver.scheduler.tickID_);
    }

    // Clear out any timeout
    scheduler.resume();

    // Clear data stores
    scheduler.tickID_ = -1;
    scheduler.tasks_ = [];
    scheduler.namedTasks_ = {};
  };
});
