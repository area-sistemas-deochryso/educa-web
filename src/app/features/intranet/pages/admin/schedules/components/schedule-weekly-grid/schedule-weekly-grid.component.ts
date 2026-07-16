import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import type {
  DiaSemana,
  EmptySlotClickEvent,
  HorarioWeeklyBlock,
} from '../../models/horario.interface';
import { DIAS_SEMANA, HORAS_DIA } from '../../models/horario.interface';

@Component({
  selector: 'app-schedule-weekly-grid',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './schedule-weekly-grid.component.html',
  styleUrl: './schedule-weekly-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleWeeklyGridComponent {
  readonly blocks = input.required<HorarioWeeklyBlock[]>();
  readonly loading = input<boolean>(false);
  readonly isAdmin = input<boolean>(true);
  readonly contextSalonId = input<number | null>(null);

  readonly blockClick = output<number>();
  readonly emptySlotClick = output<EmptySlotClickEvent>();
  readonly editClick = output<number>();
  readonly viewDetailClick = output<number>();

  readonly DIAS = DIAS_SEMANA.filter((d) => d.value <= 5);
  readonly HORAS = HORAS_DIA;

  readonly blocksByDayAndHour = computed(() => {
    const map = new Map<string, HorarioWeeklyBlock[]>();
    for (const block of this.blocks()) {
      const startHour = block.horario.horaInicio.substring(0, 2);
      const key = `${block.dia}-${startHour}`;
      const existing = map.get(key) || [];
      existing.push(block);
      map.set(key, existing);
    }
    return map;
  });

  getBlocksForSlot(dia: number, hora: string): HorarioWeeklyBlock[] {
    const hourNum = hora.substring(0, 2);
    return this.blocksByDayAndHour().get(`${dia}-${hourNum}`) || [];
  }

  isSlotEmpty(dia: number, hora: string): boolean {
    return this.getBlocksForSlot(dia, hora).length === 0;
  }

  /** true si ninguna hora del día tiene bloques asignados (columna completa vacía). */
  isDayEmpty(dia: number): boolean {
    return !this.blocks().some((block) => block.dia === dia);
  }

  hasNoProfesor(block: HorarioWeeklyBlock): boolean {
    return block.horario.profesorId === null;
  }

  hasNoEstudiantes(block: HorarioWeeklyBlock): boolean {
    return block.horario.cantidadEstudiantes === 0;
  }

  getBlockTooltip(block: HorarioWeeklyBlock): string {
    const h = block.horario;
    const lines = [
      h.cursoNombre,
      `${h.horaInicio} - ${h.horaFin}`,
      `Salón: ${h.salonDescripcion}`,
    ];
    if (h.profesorNombreCompleto) {
      lines.push(`Profesor: ${h.profesorNombreCompleto}`);
    } else {
      lines.push('⚠ Sin profesor asignado');
    }
    if (h.cantidadEstudiantes > 0) {
      lines.push(`${h.cantidadEstudiantes} estudiantes`);
    } else {
      lines.push('⚠ Sin estudiantes asignados');
    }
    return lines.join('\n');
  }

  onBlockClick(block: HorarioWeeklyBlock): void {
    this.blockClick.emit(block.horario.id);
  }

  onEditClick(event: Event, block: HorarioWeeklyBlock): void {
    event.stopPropagation();
    this.editClick.emit(block.horario.id);
  }

  onViewDetailClick(event: Event, block: HorarioWeeklyBlock): void {
    event.stopPropagation();
    this.viewDetailClick.emit(block.horario.id);
  }

  onEmptySlotClick(dia: number, hora: string): void {
    if (!this.isAdmin()) return;
    this.emptySlotClick.emit({
      dia: dia as DiaSemana,
      hora,
      salonId: this.contextSalonId() ?? undefined,
    });
  }

  darkenColor(hex: string): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - 40);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
    const b = Math.max(0, (num & 0x0000ff) - 40);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}
