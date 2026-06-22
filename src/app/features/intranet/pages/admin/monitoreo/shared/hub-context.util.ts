// #region Imports
import { ActivatedRoute } from '@angular/router';

import { BadgeLevel } from '../models/monitoreo-hub-badges.models';
// #endregion

// #region Types
export interface HubContext {
	fromHub: boolean;
	level: BadgeLevel | null;
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

function isValidLevel(value: string | null): value is BadgeLevel {
	return value === 'warn' || value === 'critical';
}
// #endregion
