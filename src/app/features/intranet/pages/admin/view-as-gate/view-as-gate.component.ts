// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EduButton } from '@edu-ui';

import { PageHeaderComponent } from '@intranet-shared/components/page-header';
import { ViewAsPickerComponent } from '@intranet-shared/components/view-as-picker';

import { AuthService } from '@core/services/auth';
import { UserPermissionsService } from '@core/services/permissions';
import { VIEW_AS_CAPABILITY, ViewAsContext, ViewAsContextService, ViewAsRol } from '@core/services/view-as';
// #endregion

// #region Implementation
/**
 * Entry gate for the "ver como" flow (P92 F2, decision #3; P115 F3): a user
 * with the "ver como" capability lands here — via `viewAsGateGuard` redirecting from
 * `estudiante/*`/`profesor/*`, or by navigating here directly — and must
 * pick a user of the matching role before the guard lets them through.
 *
 * Route: `ver-como/:rol` (`rol` = `'profesor' | 'estudiante'`, lowercase to
 * match the existing URL segment convention). `returnUrl` query param, when
 * present, is where `viewAsGateGuard` redirected from; otherwise falls back
 * to the module's "Mis Cursos" landing page.
 */
@Component({
	selector: 'app-view-as-gate',
	standalone: true,
	imports: [RouterLink, EduButton, PageHeaderComponent, ViewAsPickerComponent],
	templateUrl: './view-as-gate.component.html',
	styleUrl: './view-as-gate.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewAsGateComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly authService = inject(AuthService);
	private readonly userPermissions = inject(UserPermissionsService);
	private readonly viewAsContext = inject(ViewAsContextService);

	readonly rol = signal<ViewAsRol | null>(null);
	private returnUrl: string | null = null;

	async ngOnInit(): Promise<void> {
		// Defense in depth — the route itself is reachable by any authenticated user (it reuses the
		// generic `intranet` permission path, same trick as the `ayuda` route). The real security
		// boundary is the backend: without `USUARIOS_API_IMPERSONATE`, `ResolveViewAsIdentity` 403s
		// regardless of what a user without it sets here. This redirect is purely UX, and it asks for
		// the capability (assignable per role), not for a role name (P115 F3).
		await this.userPermissions.ensurePermisosLoaded();
		if (!this.userPermissions.hasOwnCapability(VIEW_AS_CAPABILITY)) {
			this.router.navigateByUrl('/intranet');
			return;
		}

		const rolParam = this.route.snapshot.paramMap.get('rol');
		const resolved = rolParam === 'profesor' ? 'Profesor' : rolParam === 'estudiante' ? 'Estudiante' : null;
		if (!resolved) {
			this.router.navigateByUrl('/intranet');
			return;
		}

		// A real profesor/estudiante has nobody to "view as" inside their own module.
		if (this.authService.currentUser?.rol === resolved) {
			this.router.navigateByUrl('/intranet');
			return;
		}

		this.rol.set(resolved);
		this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
	}

	onUserSelected(context: ViewAsContext): void {
		this.viewAsContext.setContext(context);
		const fallback = `/intranet/${context.rol.toLowerCase()}/cursos`;
		this.router.navigateByUrl(this.returnUrl ?? fallback);
	}
}
// #endregion
