import { Component, inject } from '@angular/core';

import { COURSE_NAMES } from '@features/intranet/pages/schedule-component/courses.config';
import { NotificationQuickAccessComponent } from '@features/intranet/components/notification-quick-access/notification-quick-access';
import { QuickAccessCardComponent } from '@features/intranet/components/quick-access-card/quick-access-card';
import { QuickAccessCardMenuComponent } from '@features/intranet/components/quick-access-card-menu/quick-access-card-menu';
import { StorageService } from '@core/services';
import { WelcomeSectionComponent } from '@features/intranet/components/welcome-section/welcome-section';
import { environment } from '@config/environment';

@Component({
	selector: 'app-home.component',
	imports: [
		QuickAccessCardComponent,
		QuickAccessCardMenuComponent,
		WelcomeSectionComponent,
		NotificationQuickAccessComponent,
	],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent {
	private storage = inject(StorageService);

	readonly showQuickAccess = environment.features.quickAccess;
	availableCourses = COURSE_NAMES;

	get welcomeTitle(): string {
		const user = this.storage.getUser();
		if (user?.nombreCompleto) {
			const firstName = user.nombreCompleto;
			return `Bienvenido, ${firstName}`;
		}
		return 'Bienvenido a tu Intranet';
	}
}
