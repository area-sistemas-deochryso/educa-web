// #region Imports
import { ActivatedRoute } from '@angular/router';
// #endregion

// #region Types
type ContextLevel = 'warn' | 'critical';

export interface HubContext {
	fromHub: boolean;
	level: ContextLevel | null;
}
// #endregion

// #region Utility
export function readHubContext(route: ActivatedRoute): HubContext {
	const params = route.snapshot.queryParamMap;
	const fromHub = params.get('from') === 'hub';
	const rawLevel = params.get('level');
	const level = isValidLevel(rawLevel) ? rawLevel : null;

	return { fromHub, level };
}

function isValidLevel(value: string | null): value is ContextLevel {
	return value === 'warn' || value === 'critical';
}
// #endregion
