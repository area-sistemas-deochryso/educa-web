import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import type {
  EmptySlotClickEvent,
  HorarioWeeklyBlock,
  ScheduleEntityItem,
} from '../../models/horario.interface';
import { ScheduleEntityListComponent } from '../schedule-entity-list/schedule-entity-list.component';
import { ScheduleWeeklyGridComponent } from '../schedule-weekly-grid/schedule-weekly-grid.component';

@Component({
  selector: 'app-schedule-grid-layout',
  standalone: true,
  imports: [CommonModule, ScheduleEntityListComponent, ScheduleWeeklyGridComponent],
  templateUrl: './schedule-grid-layout.component.html',
  styleUrl: './schedule-grid-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleGridLayoutComponent {
  readonly entities = input.required<ScheduleEntityItem[]>();
  readonly selectedEntityId = input<number | null>(null);
  readonly blocks = input<HorarioWeeklyBlock[]>([]);
  readonly loading = input<boolean>(false);
  readonly isAdmin = input<boolean>(true);
  readonly entityLabel = input<string>('Salón');
  readonly contextSalonId = input<number | null>(null);

  readonly entitySelect = output<number>();
  readonly blockClick = output<number>();
  readonly emptySlotClick = output<EmptySlotClickEvent>();
  readonly editClick = output<number>();
  readonly viewDetailClick = output<number>();
}
