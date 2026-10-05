import { CanDeactivateFn } from '@angular/router';

import type { HasPendingChanges } from './has-pending-changes';

// #region Implementation
/**
 * Asks before leaving a route whose component reports unsaved edits.
 *
 * Only runs when the route is deactivated (leaving it, or a path-param change that
 * reuses it) — not on a query-only change nor when a child route replaces another,
 * so apply it on the route that owns the edits, not on its tabs.
 *
 * @example
 * { path: 'profesor/cursos/:cursoId/:salonId', canDeactivate: [pendingChangesGuard], ... }
 */
export const pendingChangesGuard: CanDeactivateFn<HasPendingChanges> = (component) =>
	component.hasPendingChanges() ? component.confirmLeave() : true;
// #endregion
