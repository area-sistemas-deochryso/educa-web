import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@app/core/services';
import { inject } from '@angular/core';

// * Blocks intranet routes when there is no authenticated session.
export const authGuard: CanActivateFn = () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	// Verificación del token local
	// Nota: no hace roundtrip al servidor; solo valida el estado en memoria.
	if (authService.isAuthenticated) {
		return true;
	}

	// No autenticado, redirigir al login
	return router.createUrlTree(['/intranet/login']);
};
