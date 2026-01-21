import { Component, inject } from '@angular/core';

import { COURSE_NAMES } from '../schedule-component/courses.config';
import { IntranetBackground } from '../../components/intranet-background/intranet-background';
import { NotificationQuickAccess } from '../../components/notification-quick-access/notification-quick-access';
import { QuickAccessCard } from '../../components/quick-access-card/quick-access-card';
import { QuickAccessCardMenu } from '../../components/quick-access-card-menu/quick-access-card-menu';
import { StorageService } from '../../../../services';
import { WelcomeSection } from '../../components/welcome-section/welcome-section';

@Component({
	selector: 'app-home.component',
	imports: [
		IntranetBackground,
		QuickAccessCard,
		QuickAccessCardMenu,
		WelcomeSection,
		NotificationQuickAccess,
	],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent {
	private storage = inject(StorageService);

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
