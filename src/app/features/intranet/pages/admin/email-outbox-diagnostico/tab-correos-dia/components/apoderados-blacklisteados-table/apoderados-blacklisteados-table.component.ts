import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ApoderadoBlacklisteadoDelDia } from '../../models/correos-dia.models';
import { EduTable, EduTag } from '@edu-ui';

@Component({
	selector: 'app-apoderados-blacklisteados-table',
	standalone: true,
	imports: [EduTable, EduTag, DatePipe],
	templateUrl: './apoderados-blacklisteados-table.component.html',
	styleUrl: './apoderados-blacklisteados-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApoderadosBlacklisteadosTableComponent {
	readonly data = input.required<ApoderadoBlacklisteadoDelDia[]>();
}
