import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import type { HorarioResponseDto } from '../../models/horario.interface';
import { DIAS_SEMANA } from '../../models/horario.interface';

interface ProblemGroup {
  type: 'no-profesor' | 'conflict';
  icon: string;
  label: string;
  severity: string;
  items: ProblemItem[];
}

interface ProblemItem {
  horarioId: number;
  curso: string;
  salon: string;
  dia: string;
  hora: string;
  detail: string;
}

@Component({
  selector: 'app-schedule-global-view',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './schedule-global-view.component.html',
  styleUrl: './schedule-global-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleGlobalViewComponent {
  readonly horarios = input.required<HorarioResponseDto[]>();
  readonly loading = input<boolean>(false);

  readonly viewDetail = output<number>();

  readonly problems = computed<ProblemGroup[]>(() => {
    const all = this.horarios();
    const groups: ProblemGroup[] = [];

    const sinProfesor = all.filter((h) => h.estado && h.profesorId === null);
    if (sinProfesor.length > 0) {
      groups.push({
        type: 'no-profesor',
        icon: 'pi pi-user-minus',
        label: 'Sin Profesor Asignado',
        severity: 'warning',
        items: sinProfesor.map((h) => ({
          horarioId: h.id,
          curso: h.cursoNombre,
          salon: h.salonDescripcion,
          dia: this.getDiaLabel(h.diaSemana),
          hora: `${h.horaInicio} - ${h.horaFin}`,
          detail: `${h.cantidadEstudiantes} estudiantes sin profesor`,
        })),
      });
    }

    const conflicts = this.findConflicts(all);
    if (conflicts.length > 0) {
      groups.push({
        type: 'conflict',
        icon: 'pi pi-exclamation-circle',
        label: 'Conflictos de Horario',
        severity: 'error',
        items: conflicts,
      });
    }

    return groups;
  });

  readonly totalProblems = computed(() =>
    this.problems().reduce((sum, g) => sum + g.items.length, 0),
  );

  onViewDetail(id: number): void {
    this.viewDetail.emit(id);
  }

  private getDiaLabel(dia: number): string {
    return DIAS_SEMANA.find((d) => d.value === dia)?.label || `Día ${dia}`;
  }

  private findConflicts(horarios: HorarioResponseDto[]): ProblemItem[] {
    const active = horarios.filter((h) => h.estado);
    const items: ProblemItem[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];

        if (a.diaSemana !== b.diaSemana) continue;
        if (a.salonId !== b.salonId && a.profesorId !== b.profesorId) continue;
        if (a.profesorId === null && b.profesorId === null) continue;

        const overlaps = a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;
        if (!overlaps) continue;

        const key = [Math.min(a.id, b.id), Math.max(a.id, b.id)].join('-');
        if (seen.has(key)) continue;
        seen.add(key);

        const isSalonConflict = a.salonId === b.salonId;
        const isProfesorConflict = a.profesorId !== null && a.profesorId === b.profesorId;

        let detail = '';
        if (isSalonConflict && isProfesorConflict) {
          detail = `Mismo salón y profesor: ${a.salonDescripcion}`;
        } else if (isSalonConflict) {
          detail = `Mismo salón: ${a.salonDescripcion}`;
        } else {
          detail = `Mismo profesor: ${a.profesorNombreCompleto}`;
        }

        items.push({
          horarioId: a.id,
          curso: `${a.cursoNombre} ↔ ${b.cursoNombre}`,
          salon: a.salonDescripcion,
          dia: this.getDiaLabel(a.diaSemana),
          hora: `${a.horaInicio}-${a.horaFin} / ${b.horaInicio}-${b.horaFin}`,
          detail,
        });
      }
    }

    return items;
  }
}
