/**
 * @fileoverview Definition of constants.
 */

goog.provide('treesaver.constants');

/**
 * Whether the code is loaded via modules or a single file
 *
 * @define {boolean}
 */
var USE_MODULES = true;

/**
 * Whether older browsers should be supported
 *
 * @define {boolean}
 */
var SUPPORT_LEGACY = true;

/**
 * Whether Internet Explorer should be supported
 *
 * @define {boolean}
 */
var SUPPORT_IE = true;

/**
 * How long until the UI is deemed idle
 *
 * @define {number}
 */
var UI_IDLE_INTERVAL = 5000; // 5 seconds

/**
 * How long to wait before kicking off repagination when resizing
 *
 * @define {number}
 */
var PAGINATE_DEBOUNCE_TIME = 200; // .2 seconds

/**
 * How many pixels of movement before it's considered a swipe
 *
 * @define {number}
 */
var SWIPE_THRESHOLD = 30;

/**
 * How much time can elapse before the swipe is ignored
 *
 * @define {number}
 */
var SWIPE_TIME_LIMIT = 2000; // 2 seconds

/**
 * Length of page animations
 *
 * @define {number}
 */
var MAX_ANIMATION_DURATION = 200; // .2 seconds

/**
 * How often to check for resizes and orientations
 *
 * @define {number}
 */
var CHECK_STATE_INTERVAL = 100; // .1 seconds

/**
 * How long to wait between mouse wheel events
 * Magic mouse can generate a ridiculous number of events
 *
 * @define {number}
 */
var MOUSE_WHEEL_INTERVAL = 1500; // 1.5 seconds

/**
 * Is the application being hosted within the iOS wrapper?
 *
 * @define {boolean}
 */
var WITHIN_IOS_WRAPPER = false;
