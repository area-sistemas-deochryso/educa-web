// * Debug helper exports.
// #region Imports
import {
	compileDebugFilter,
	safeGetLocalStorage,
	safeRemoveLocalStorage,
	safeSetLocalStorage,
} from './debug.filter';
import { DbgLevel, DebugConfig, DEBUG_CONFIG } from './debug.type';
import { DebugService } from './debug.service';

// #endregion
// #region Implementation
export {
	compileDebugFilter,
	safeGetLocalStorage,
	safeSetLocalStorage,
	safeRemoveLocalStorage,
	DEBUG_CONFIG,
	DebugService,
};
export type { DbgLevel, DebugConfig };
// #endregion
