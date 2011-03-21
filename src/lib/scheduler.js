/**
 * @fileoverview Basic task scheduling.
 *
 */

goog.provide('treesaver.scheduler');

// Avoid circular dependency
//goog.require('treesaver.debug');

/**
 * Milliseconds between checks for task execution
 *
 * @const
 * @type {number}
 */
treesaver.scheduler.TASK_INTERVAL = 25; // 40 per second

/**
 * Array of all tasks
 *
 * @private
 * @type {Array}
 */
treesaver.scheduler.tasks_ = [];

/**
 * Map of named tasks
 *
 * @private
 * @type {Object}
 */
treesaver.scheduler.namedTasks_ = {};

/**
 * If set, suspends all tasks except the ones named in this array
 *
 * @private
 * @type {Array.<string>}
 */
treesaver.scheduler.taskWhitelist_ = null;

/**
 * ID of the scheduler tick task
 *
 * @private
 */
treesaver.scheduler.tickID_;

/**
 * Master callback for task execution
 * @private
 */
treesaver.scheduler.tick_ = function() {
  var now = goog.now();

  treesaver.scheduler.tasks_.forEach(function(task, i) {
    // If the tick function is no longer on interval, prevent all task
    // execution
    if (!treesaver.scheduler.tickID_) {
      return;
    }

    // Was the task removed? If so, skip execution
    if (task.removed) {
      return;
    }

    // Is the whitelist active?
    if (treesaver.scheduler.taskWhitelist_) {
      if (!task.name ||
        treesaver.scheduler.taskWhitelist_.indexOf(task.name) === -1) {
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
        treesaver.array.remove(treesaver.scheduler.tasks_, i);
        delete treesaver.scheduler.namedTasks_[task.name];

        // Exit early in order to make sure we don't execute an extra time
        if (task.immediate) {
          return;
        }
      }
    }

    task.fun.apply(task.obj, task.args);
  });

  // Don't waste cycles if there's nothing in the queue
  if (!treesaver.scheduler.tasks_.length) {
    treesaver.scheduler.stopAll();
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
treesaver.scheduler.addTask_ =
  function(fun, interval, times, args, immediate, name, obj) {
  var now = goog.now(),
      // Re-use previous task if it exists
      task = name ? treesaver.scheduler.namedTasks_[name] : null;

  if (goog.DEBUG) {
    if (!fun.apply) {
      treesaver.debug.error('Function without apply() not added to the scheduler');
      return;
    }
  }

  if (!task) {
    // Create a new task object
    task = {
      fun: fun,
      name: name,
      obj: obj,
      last: immediate ? -Infinity : now
    };

    // Store
    treesaver.scheduler.tasks_.push(task);
    if (name) {
      treesaver.scheduler.namedTasks_[name] = task;
    }
  }

  task.args = args || [];
  task.times = times;
  task.interval = Math.max(interval, treesaver.scheduler.TASK_INTERVAL);
  task.immediate = immediate;
  task.removed = false;

  // Restart the tick callback if it's not active
  if (!treesaver.scheduler.tickID_) {
    treesaver.scheduler.tickID_ = window.setInterval(
      treesaver.scheduler.tick_,
      treesaver.scheduler.TASK_INTERVAL
    );
  }
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
treesaver.scheduler.delay = function(fun, delay, args, name, obj) {
  treesaver.scheduler.addTask_(fun, delay, 1, args, false, name, obj);
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
treesaver.scheduler.repeat = function(fun, interval, times, args, name, obj) {
  treesaver.scheduler.addTask_(fun, interval, times, args, false, name, obj);
};

/**
 * Add a function to the execution queue
 * @param {!function()} fun
 * @param {Array=}      args
 * @param {string=}     name
 * @param {Object=}     obj
 */
treesaver.scheduler.queue = function(fun, args, name, obj) {
  treesaver.scheduler.addTask_(fun, 0, 1, args, false, name, obj);
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
treesaver.scheduler.debounce =
  function(fun, interval, args, immediate, name, obj) {
  // Check if the task already exists
  var task = treesaver.scheduler.namedTasks_[name];

  if (task) {
    // Update timestamp to further delay execution
    task.last = goog.now();
  }
  else {
    treesaver.scheduler.addTask_(fun, interval, 1, args, immediate, name, obj);
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
treesaver.scheduler.limit = function(fun, interval, args, name, obj) {
  // Check if the task already exists
  var task = treesaver.scheduler.namedTasks_[name];

  // Ignore if already in the queue
  if (!task) {
    treesaver.scheduler.addTask_(fun, interval, 1, args, true, name, obj);
  }
};

/**
 * Pause all tasks except those named in the whitelist
 *
 * @param {Array.<string>} whitelist Names of tasks that can still execute.
 * @param {?number} timeout Timeout before auto-resume.
 */
treesaver.scheduler.pause = function(whitelist, timeout) {
  treesaver.scheduler.taskWhitelist_ = whitelist;
  if (timeout) {
    treesaver.scheduler.pauseTimeoutId_ =
      setTimeout(treesaver.scheduler.resume, timeout);
  }
};

/**
 * Resume task execution
 */
treesaver.scheduler.resume = function() {
  treesaver.scheduler.taskWhitelist_ = null;
  if (treesaver.scheduler.pauseTimeoutId_) {
    window.clearTimeout(treesaver.scheduler.pauseTimeoutId_);
    treesaver.scheduler.pauseTimeoutId_ = null;
  }
};

/**
 * Remove a task from the execution queue
 * @param {!string} name Task name.
 */
treesaver.scheduler.clear = function(name) {
  delete treesaver.scheduler.namedTasks_[name];

  treesaver.scheduler.tasks_.forEach(function(task, i) {
    if (task.name === name) {
      treesaver.array.remove(treesaver.scheduler.tasks_, i);
      // Mark task as inactive, in case there are any references left
      task.removed = true;
    }
  });
};

/**
 * Stop all functions from being executed, and clear out the queue
 */
treesaver.scheduler.stopAll = function() {
  // Stop task
  if (treesaver.scheduler.tickID_) {
    window.clearInterval(treesaver.scheduler.tickID_);
  }

  // Clear out any timeout
  treesaver.scheduler.resume();

  // Clear data stores
  treesaver.scheduler.tickID_ = null;
  treesaver.scheduler.tasks_ = [];
  treesaver.scheduler.namedTasks_ = {};
};
