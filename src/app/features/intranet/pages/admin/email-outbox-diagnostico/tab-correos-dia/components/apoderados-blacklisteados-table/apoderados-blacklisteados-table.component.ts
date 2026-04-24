import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ApoderadoBlacklisteadoDelDia } from '../../models/correos-dia.models';

@Component({
	selector: 'app-apoderados-blacklisteados-table',
	standalone: true,
	imports: [TableModule, TagModule, DatePipe],
	templateUrl: './apoderados-blacklisteados-table.component.html',
	styleUrl: './apoderados-blacklisteados-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApoderadosBlacklisteadosTableComponent {
	readonly data = input.required<ApoderadoBlacklisteadoDelDia[]>();
}
