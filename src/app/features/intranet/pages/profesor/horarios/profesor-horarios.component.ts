// #region Imports
import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProfesorFacade } from '../services/profesor.facade';
import { HorarioProfesorDto } from '../models';

// #endregion
// #region Block interface
interface HorarioBlock {
	id: number;
	cursoNombre: string;
	horaInicio: string;
	horaFin: string;
	salonId: number;
	salonDescripcion: string;
	cantidadEstudiantes: number;
	dia: number;
	color: string;
	borderColor: string;
	topPx: number;
	heightPx: number;
}

// #endregion
// #region Color palette
const CURSO_COLORS = [
	'#3B82F6', '#10B981', '#F59E0B', '#EF4444',
	'#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

function darkenColor(hex: string): string {
	const num = parseInt(hex.replace('#', ''), 16);
	const r = Math.max(0, (num >> 16) - 40);
	const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
	const b = Math.max(0, (num & 0x0000ff) - 40);
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const HORA_INICIO_DIA = 7 * 60; // 07:00 en minutos
const PX_PER_HOUR = 60;

function buildBlocks(horarios: HorarioProfesorDto[]): HorarioBlock[] {
	const colorMap = new Map<number, string>();
	let colorIdx = 0;

	return horarios.map((h) => {
		if (!colorMap.has(h.cursoId)) {
			colorMap.set(h.cursoId, CURSO_COLORS[colorIdx % CURSO_COLORS.length]);
			colorIdx++;
		}

		const [hi, mi] = h.horaInicio.split(':').map(Number);
		const [hf, mf] = h.horaFin.split(':').map(Number);
		const startMin = hi * 60 + mi;
		const endMin = hf * 60 + mf;
		const duration = endMin - startMin;
		const offset = startMin - HORA_INICIO_DIA;
		const color = colorMap.get(h.cursoId) || CURSO_COLORS[0];

		return {
			id: h.id,
			cursoNombre: h.cursoNombre,
			horaInicio: h.horaInicio,
			horaFin: h.horaFin,
			salonId: h.salonId,
			salonDescripcion: h.salonDescripcion,
			cantidadEstudiantes: h.cantidadEstudiantes,
			dia: h.diaSemana,
			color,
			borderColor: darkenColor(color),
			topPx: (offset / 60) * PX_PER_HOUR,
			heightPx: (duration / 60) * PX_PER_HOUR,
		};
	});
}

// #endregion
// #region Component
@Component({
	selector: 'app-profesor-horarios',
	standalone: true,
	imports: [CommonModule, ButtonModule, TooltipModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './profesor-horarios.component.html',
	styleUrl: './profesor-horarios.component.scss',
})
export class ProfesorHorariosComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly router = inject(Router);

	// #endregion
	// #region Estado
	readonly vm = this.facade.vm;

	readonly weeklyBlocks = computed<HorarioBlock[]>(() => buildBlocks(this.vm().horarios));

	// #endregion
	// #region Constantes
	readonly DIAS = [
		{ label: 'Lunes', short: 'Lun', value: 1 },
		{ label: 'Martes', short: 'Mar', value: 2 },
		{ label: 'Miércoles', short: 'Mié', value: 3 },
		{ label: 'Jueves', short: 'Jue', value: 4 },
		{ label: 'Viernes', short: 'Vie', value: 5 },
	];

	readonly HORAS = [
		'07:00', '08:00', '09:00', '10:00', '11:00',
		'12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
	];

	// #endregion
	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadData();
	}

	// #endregion
	// #region Helpers
	getBlocksForDay(dia: number): HorarioBlock[] {
		return this.weeklyBlocks().filter((b) => b.dia === dia);
	}

	getBlockStyle(block: HorarioBlock): Record<string, string> {
		return {
			top: `${block.topPx}px`,
			height: `${block.heightPx}px`,
			background: block.color,
			borderLeft: `4px solid ${block.borderColor}`,
		};
	}

	getTooltipContent(block: HorarioBlock): string {
		return `${block.cursoNombre}\n${block.horaInicio} - ${block.horaFin}\nSalón: ${block.salonDescripcion}\n${block.cantidadEstudiantes} estudiantes`;
	}

	// #endregion
	// #region Event handlers
	verAsistencia(block: HorarioBlock): void {
		this.router.navigate(['/intranet/asistencia'], {
			queryParams: { salonId: block.salonId },
		});
	}
	// #endregion
}
// #endregion
