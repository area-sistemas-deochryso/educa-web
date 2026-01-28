import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@app/core/services';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	// Verificación del token local
	if (authService.isAuthenticated) {
		return true;
	}

	// No autenticado, redirigir al login
	return router.createUrlTree(['/intranet/login']);
};
