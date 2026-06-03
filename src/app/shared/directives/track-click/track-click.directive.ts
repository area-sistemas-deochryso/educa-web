import { Directive, HostListener, inject, input } from '@angular/core';

import { ActivityTrackerService } from '@core/services/error';

@Directive({
	selector: '[appTrackClick]',
	standalone: true,
})
export class TrackClickDirective {
	private readonly activityTracker = inject(ActivityTrackerService);

	readonly appTrackClick = input.required<string>();

	@HostListener('click')
	onClick(): void {
		this.activityTracker.track('USER_ACTION', this.appTrackClick(), { action: 'click' });
	}
}
