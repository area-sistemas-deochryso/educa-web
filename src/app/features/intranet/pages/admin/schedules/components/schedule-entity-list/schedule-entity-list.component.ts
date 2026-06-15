import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TooltipModule } from 'primeng/tooltip';

import type { ScheduleEntityItem } from '../../models/horario.interface';

@Component({
  selector: 'app-schedule-entity-list',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './schedule-entity-list.component.html',
  styleUrl: './schedule-entity-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleEntityListComponent {
  readonly entities = input.required<ScheduleEntityItem[]>();
  readonly selectedId = input<number | null>(null);
  readonly loading = input<boolean>(false);
  readonly entityLabel = input<string>('Salón');

  readonly entitySelect = output<number>();

  readonly sortedEntities = computed(() => {
    const items = this.entities();
    return [...items].sort((a, b) => {
      if (a.hasConflicts !== b.hasConflicts) return a.hasConflicts ? -1 : 1;
      const aIncomplete = a.totalSchedules > 0 && a.withProfesor < a.totalSchedules;
      const bIncomplete = b.totalSchedules > 0 && b.withProfesor < b.totalSchedules;
      if (aIncomplete !== bIncomplete) return aIncomplete ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  });

  getStatusIcon(entity: ScheduleEntityItem): string {
    if (entity.hasConflicts) return 'pi pi-exclamation-circle';
    if (entity.totalSchedules === 0) return 'pi pi-minus-circle';
    if (entity.withProfesor < entity.totalSchedules) return 'pi pi-exclamation-triangle';
    return 'pi pi-check-circle';
  }

  getStatusClass(entity: ScheduleEntityItem): string {
    if (entity.hasConflicts) return 'status-error';
    if (entity.totalSchedules === 0) return 'status-empty';
    if (entity.withProfesor < entity.totalSchedules) return 'status-warning';
    return 'status-success';
  }

  getStatusTooltip(entity: ScheduleEntityItem): string {
    if (entity.hasConflicts) return 'Tiene conflictos de horario';
    if (entity.totalSchedules === 0) return 'Sin horarios asignados';
    if (entity.withProfesor < entity.totalSchedules) {
      const missing = entity.totalSchedules - entity.withProfesor;
      return `${missing} horario(s) sin profesor`;
    }
    return 'Completo';
  }

  onSelect(entity: ScheduleEntityItem): void {
    this.entitySelect.emit(entity.id);
  }
}
