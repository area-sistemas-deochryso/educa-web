import { Component } from '@angular/core';
import { IntranetBackground } from '../../components/intranet-background/intranet-background';
import { QuickAccessCard } from '../../components/quick-access-card/quick-access-card';
import { QuickAccessCardMenu } from '../../components/quick-access-card-menu/quick-access-card-menu';
import { WelcomeSection } from '../../components/welcome-section/welcome-section';
import { NotificationQuickAccess } from '../../components/notification-quick-access/notification-quick-access';
import { COURSE_NAMES } from '../schedule-component/courses.config';

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
	availableCourses = COURSE_NAMES;
}
