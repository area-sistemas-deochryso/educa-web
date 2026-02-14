// #region Imports
import { InjectionToken } from '@angular/core';
import type { Environment } from '@config';

// #endregion
// #region Implementation
export type FeatureFlags = Environment['features'];
export type FeatureFlagKey = keyof FeatureFlags;

export interface FeatureFlagsConfig {
	/** Even if true, overrides only apply in dev mode */
	enabled?: boolean;

	/** localStorage key for overrides (default "FEATURE_FLAGS") */
	storageKey?: string;
}

export const FEATURE_FLAGS_CONFIG = new InjectionToken<FeatureFlagsConfig>(
	'FEATURE_FLAGS_CONFIG',
);
// #endregion
