import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import type { HorarioWeeklyBlock } from '../../models/horario.interface';

@Component({
  selector: 'app-horarios-weekly-view',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './horarios-weekly-view.component.html',
  styleUrl: './horarios-weekly-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorariosWeeklyViewComponent {
  // ============ Inputs ============
  readonly blocks = input.required<HorarioWeeklyBlock[]>();
  readonly loading = input<boolean>(false);

  // ============ Outputs ============
  readonly blockClick = output<number>();
  readonly editClick = output<number>();
  readonly viewDetailClick = output<number>();

  // ============ Constantes ============
  readonly DIAS = [
    { label: 'Lunes', value: 1 },
    { label: 'Martes', value: 2 },
    { label: 'Miércoles', value: 3 },
    { label: 'Jueves', value: 4 },
    { label: 'Viernes', value: 5 },
  ];

  readonly HORAS = [
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  // ============ Helpers ============
  getBlocksForDay(dia: number): HorarioWeeklyBlock[] {
    return this.blocks().filter((b) => b.dia === dia);
  }

  getBlockStyle(block: HorarioWeeklyBlock): Record<string, string> {
    // Calcular altura basada en duración (1 hora = 60px)
    const heightPx = (block.duracionMinutos / 60) * 60;

    // Calcular posición top basada en offset desde las 07:00
    const topPx = (block.posicionVertical / 60) * 60;

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
      background: block.color,
      borderLeft: `4px solid ${this.darkenColor(block.color)}`,
    };
  }

  getTooltipContent(block: HorarioWeeklyBlock): string {
    const h = block.horario;
    return `
      ${h.cursoNombre}
      ${h.horaInicio} - ${h.horaFin}
      Salón: ${h.salonDescripcion}
      ${h.profesorNombreCompleto ? `Profesor: ${h.profesorNombreCompleto}` : 'Sin profesor asignado'}
      ${h.cantidadEstudiantes} estudiantes
    `.trim();
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

  trackByBlockId(_index: number, block: HorarioWeeklyBlock): number {
    return block.horario.id;
  }

  // ============ Helpers privados ============
  private darkenColor(hex: string): string {
    // Oscurecer el color para el borde
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - 40);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
    const b = Math.max(0, (num & 0x0000ff) - 40);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}
