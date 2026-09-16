import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LevelPageData } from '../level-page-data';

@Component({
	selector: 'app-level-page',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './level-page.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './level-page.component.scss',
})
export class LevelPageComponent {
	readonly data = input.required<LevelPageData>();
}
