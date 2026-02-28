// #region Imports
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@app/core/services';
import { inject } from '@angular/core';

/**
 * Guard that blocks intranet routes when there is no authenticated session.
 *
 * This guard checks local auth state only and does not call the server.
 *
 * @example
 * canActivate: [authGuard]
 */
// #endregion
// #region Implementation
export const authGuard: CanActivateFn = () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	// Verify local auth state only.
	if (authService.isAuthenticated) {
		return true;
	}

	// Not authenticated, redirect to login.
	return router.createUrlTree(['/intranet/login']);
};
// #endregion
