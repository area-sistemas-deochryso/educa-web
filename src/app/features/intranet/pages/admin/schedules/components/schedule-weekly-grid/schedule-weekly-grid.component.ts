import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitch } from 'primeng/toggleswitch';

import type {
  DiaSemana,
  EmptySlotClickEvent,
  HorarioWeeklyBlock,
} from '../../models/horario.interface';
import { DIAS_SEMANA, HORAS_DIA } from '../../models/horario.interface';

/** Fila renderizable de la grilla: una hora normal o un tramo colapsado de horas vacías. */
type GridRow =
  | { kind: 'hour'; key: string; hora: string }
  | { kind: 'collapsed'; key: string; startIndex: number; count: number; from: string; to: string };

/** Cantidad mínima de horas vacías consecutivas para colapsarlas en una fila delgada. */
const MIN_COLLAPSE_RUN = 2;

/** Clave de localStorage para la preferencia de compresión (por-navegador, no compartida con el store). */
const COMPRESS_PREF_KEY = 'educaweb.schedule-weekly-grid.compressEmptyHours';

@Component({
  selector: 'app-schedule-weekly-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule, ToggleSwitch],
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

  /** Preferencia persistida: comprimir tramos de horas sin clases. */
  readonly compressEmptyHours = signal<boolean>(this.readCompressPref());

  /** Tramos colapsados que el usuario expandió manualmente (por índice de inicio). */
  private readonly expandedRuns = signal<ReadonlySet<number>>(new Set<number>());

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

  /** true si esa hora no tiene bloques en ningún día (fila completa vacía). */
  isHourEmpty(hora: string): boolean {
    const hourNum = hora.substring(0, 2);
    const map = this.blocksByDayAndHour();
    return !this.DIAS.some((d) => (map.get(`${d.value}-${hourNum}`)?.length ?? 0) > 0);
  }

  /** Cantidad de tramos colapsados actualmente visibles (para mostrar/ocultar el toggle). */
  readonly hasCompressibleGaps = computed(() =>
    this.buildRows(true, new Set<number>()).some((r) => r.kind === 'collapsed'),
  );

  /** Filas a renderizar: cuando la compresión está activa, los tramos de horas vacías se colapsan. */
  readonly displayRows = computed<GridRow[]>(() =>
    this.buildRows(this.compressEmptyHours(), this.expandedRuns()),
  );

  private buildRows(compress: boolean, expanded: ReadonlySet<number>): GridRow[] {
    const horas = this.HORAS;
    if (!compress) {
      return horas.map((hora) => ({ kind: 'hour', key: `h-${hora}`, hora }));
    }
    const emptyFlags = horas.map((h) => this.isHourEmpty(h));
    const rows: GridRow[] = [];
    let i = 0;
    while (i < horas.length) {
      if (!emptyFlags[i]) {
        rows.push({ kind: 'hour', key: `h-${horas[i]}`, hora: horas[i] });
        i++;
        continue;
      }
      let j = i;
      while (j < horas.length && emptyFlags[j]) j++;
      const runLen = j - i;
      if (runLen >= MIN_COLLAPSE_RUN && !expanded.has(i)) {
        rows.push({
          kind: 'collapsed',
          key: `c-${i}`,
          startIndex: i,
          count: runLen,
          from: horas[i],
          to: horas[j - 1],
        });
      } else {
        for (let k = i; k < j; k++) {
          rows.push({ kind: 'hour', key: `h-${horas[k]}`, hora: horas[k] });
        }
      }
      i = j;
    }
    return rows;
  }

  onToggleCompress(value: boolean): void {
    this.compressEmptyHours.set(value);
    this.expandedRuns.set(new Set<number>());
    this.writeCompressPref(value);
  }

  /** Expande in-place un tramo colapsado sin desactivar la compresión global. */
  expandRun(startIndex: number): void {
    const next = new Set(this.expandedRuns());
    next.add(startIndex);
    this.expandedRuns.set(next);
  }

  private readCompressPref(): boolean {
    try {
      return globalThis.localStorage?.getItem(COMPRESS_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private writeCompressPref(value: boolean): void {
    try {
      globalThis.localStorage?.setItem(COMPRESS_PREF_KEY, String(value));
    } catch {
      // localStorage no disponible (modo privado / SSR): la preferencia queda solo en memoria.
    }
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
