// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { QuickAccessCardComponent } from '@features/intranet/components/quick-access-card/quick-access-card';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { StorageService } from '@core/services';
import { UserPermisosService } from '@core/services/permisos/user-permisos.service';
import { UserProfileService } from '@core/services/user/user-profile.service';
import { WelcomeSectionComponent } from '@features/intranet/components/welcome-section/welcome-section';
import { AttendanceSummaryWidgetComponent } from './components/attendance-summary-widget/attendance-summary-widget.component';
import { QUICK_ACCESS_BY_ROLE, MAX_QUICK_ACCESS, QuickAccessItem } from './quick-access.config';

// #endregion
// #region Implementation
@Component({
	selector: 'app-home.component',
	standalone: true,
	imports: [QuickAccessCardComponent, WelcomeSectionComponent, AttendanceSummaryWidgetComponent],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
	// #region Dependencias
	private storage = inject(StorageService);
	private flags = inject(FeatureFlagsFacade);
	private userPermisos = inject(UserPermisosService);
	private userProfile = inject(UserProfileService);
	// #endregion

	// #region Estado
	readonly showAttendanceWidget = computed(
		() => this.userProfile.isDirector() || this.userProfile.isAsistenteAdministrativo(),
	);
	readonly showQuickAccess = computed(() => this.flags.isEnabled('quickAccess'));

	readonly welcomeTitle = computed(() => {
		const user = this.storage.getUser();
		if (user?.nombreCompleto) {
			return `Bienvenido, ${user.nombreCompleto}`;
		}
		return 'Bienvenido a tu Intranet';
	});

	/** First 4 role-based shortcuts that the user has permission for. */
	readonly quickAccessItems = computed<QuickAccessItem[]>(() => {
		const user = this.storage.getUser();
		if (!user?.rol) return [];

		const candidates = QUICK_ACCESS_BY_ROLE[user.rol] ?? [];

		return candidates
			.filter((item) => this.userPermisos.tienePermiso(item.permiso))
			.slice(0, MAX_QUICK_ACCESS);
	});
	// #endregion
}
// #endregion
