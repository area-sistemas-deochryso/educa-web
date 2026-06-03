import { Directive, HostListener, inject, input } from '@angular/core';

import { ActivityTrackerService } from '@core/services/error';

@Directive({
	selector: '[appTrackSubmit]',
	standalone: true,
})
export class TrackSubmitDirective {
	private readonly activityTracker = inject(ActivityTrackerService);

	readonly appTrackSubmit = input.required<string>();

	@HostListener('submit')
	onSubmit(): void {
		this.activityTracker.track('USER_ACTION', this.appTrackSubmit(), { action: 'form_submit' });
	}
}
