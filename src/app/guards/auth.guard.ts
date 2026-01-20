import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services';

export const authGuard: CanActivateFn = () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	// Verificación del token local
	if (authService.isAuthenticated) {
		return true;
	}

	// No autenticado, redirigir al login
	router.navigate(['/intranet/login']);
	return false;
};
