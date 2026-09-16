import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SalonMensajeriaTabComponent } from '../mensajeria-tab/mensajeria-tab.component';
import { PageHeaderComponent } from '@intranet-shared/components';
import { EduSpinner } from '@edu-ui';

export interface MensajeriaCursoOption {
	label: string;
	value: number;
}

@Component({
	selector: 'app-mensajeria-page',
	standalone: true,
	imports: [CommonModule, EduSpinner, PageHeaderComponent, SalonMensajeriaTabComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './mensajeria-page.component.scss',
	templateUrl: './mensajeria-page.component.html',
})
export class MensajeriaPageComponent {
	readonly loading = input.required<boolean>();
	readonly cursoOptions = input.required<MensajeriaCursoOption[]>();
}
