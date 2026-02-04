import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { COURSE_NAMES } from '@features/intranet/pages/schedule-component/courses.config';
import { NotificationQuickAccessComponent } from '@features/intranet/components/notification-quick-access/notification-quick-access';
import { QuickAccessCardComponent } from '@features/intranet/components/quick-access-card/quick-access-card';
import { QuickAccessCardMenuComponent } from '@features/intranet/components/quick-access-card-menu/quick-access-card-menu';
import { StorageService } from '@core/services';
import { WelcomeSectionComponent } from '@features/intranet/components/welcome-section/welcome-section';
import { environment } from '@config/environment';

@Component({
	selector: 'app-home.component',
	standalone: true,
	imports: [
		QuickAccessCardComponent,
		QuickAccessCardMenuComponent,
		WelcomeSectionComponent,
		NotificationQuickAccessComponent,
	],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
	private storage = inject(StorageService);

	// * Feature flag controls quick access section visibility.
	readonly showQuickAccess = environment.features.quickAccess;
	// * Course list is reused by quick-access menu.
	readonly availableCourses = COURSE_NAMES;

	readonly welcomeTitle = computed(() => {
		// * Personalize welcome header if user is stored.
		const user = this.storage.getUser();
		if (user?.nombreCompleto) {
			return `Bienvenido, ${user.nombreCompleto}`;
		}
		return 'Bienvenido a tu Intranet';
	});
}
