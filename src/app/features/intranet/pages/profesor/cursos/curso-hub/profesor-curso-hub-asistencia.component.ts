import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EduTab, EduTabPanel, EduTabs } from '@edu-ui';
import { CursoHubContextService } from '@intranet-shared/components';
import { AttendanceCourseFacade } from '../services/attendance-course.facade';
import { AttendanceRegistrationPanelComponent } from '../components/attendance-registration-panel/attendance-registration-panel.component';
import { AttendanceSummaryPanelComponent } from '../components/attendance-summary-panel/attendance-summary-panel.component';
import type { EstadoAsistenciaCurso } from '../../models';

const FECHA_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_STATS = { total: 0, presentes: 0, tardes: 0, faltas: 0 };

function todayIso(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Pestaña Asistencia del hub de curso del profesor (`…/asistencia`).
 *
 * Embebe los paneles de registro y resumen con la franja que fija el shell (no hay
 * selector de curso). La asistencia depende del `horarioId` de la franja, no del
 * contenido, así que se pide con `hubContext.slot().id` y solo se muestra lo cuyo
 * `horarioId` coincide con la franja: nunca la lista de otra. El shell es dueño del
 * reset al salir del hub y del aviso por ediciones sin guardar al cambiar de franja;
 * esta pestaña no resetea al destruirse, así cambiar de pestaña conserva lo editado.
 *
 * `?fecha=yyyy-mm-dd` (viene del popover de «Mi Horario») fija la fecha inicial.
 */
@Component({
	selector: 'app-profesor-curso-hub-asistencia',
	standalone: true,
	imports: [
		EduTab,
		EduTabPanel,
		EduTabs,
		AttendanceRegistrationPanelComponent,
		AttendanceSummaryPanelComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.hub-asistencia {
			padding: 1rem;
		}
	`,
	template: `
		<div class="hub-asistencia">
			<edu-tabs value="0">
				<edu-tab value="0" data-info-anchor="profesor-asistencia-tab">
					<i class="pi pi-check-square mr-2"></i>Registrar
				</edu-tab>
				<edu-tab value="1" data-info-anchor="profesor-asistencia-tab">
					<i class="pi pi-chart-line mr-2"></i>Resumen
				</edu-tab>

				<edu-tabpanel value="0">
					<app-attendance-registration-panel
						[estudiantes]="estudiantes()"
						[loading]="vm().registroLoading"
						[saving]="vm().registroSaving"
						[stats]="stats()"
						[tieneRegistros]="tieneRegistros()"
						[diaSemanaEsperado]="diaSemana()"
						[diaSemanaEsperadoDescripcion]="diaSemanaDescripcion()"
						[initialFecha]="fecha()"
						(fechaChange)="onFechaChange($event)"
						(estadoChange)="onEstadoChange($event)"
						(justificacionChange)="onJustificacionChange($event)"
						(save)="onSave()"
					/>
				</edu-tabpanel>
				<edu-tabpanel value="1">
					<app-attendance-summary-panel
						[resumen]="resumen()"
						[loading]="vm().resumenLoading"
						[error]="vm().resumenError"
						(buscar)="onBuscarResumen($event)"
					/>
				</edu-tabpanel>
			</edu-tabs>
		</div>
	`,
})
export class ProfesorCursoHubAsistenciaComponent {
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly facade = inject(AttendanceCourseFacade);
	private readonly route = inject(ActivatedRoute);
	// #endregion

	// #region Estado derivado
	protected readonly vm = this.facade.vm;
	private readonly slotId = computed(() => this.hubContext.slot()?.id ?? null);

	/** Fecha de la lista en pantalla (`yyyy-mm-dd`); también alimenta al datepicker del panel. */
	protected readonly fecha = signal<string | null>(this.readFechaQuery());

	/** La lista cargada pertenece a la franja elegida (descarta la de otra que aún quede en el store). */
	private readonly registroDeLaFranja = computed(() => this.vm().registroData?.horarioId === this.slotId());
	protected readonly estudiantes = computed(() => (this.registroDeLaFranja() ? this.vm().registroEstudiantes : []));
	protected readonly stats = computed(() => (this.registroDeLaFranja() ? this.vm().registroStats : EMPTY_STATS));
	protected readonly tieneRegistros = computed(() =>
		this.registroDeLaFranja() ? this.vm().registroTieneRegistros : undefined,
	);
	protected readonly resumen = computed(() => {
		const resumen = this.vm().resumen;
		return resumen && resumen.horarioId === this.slotId() ? resumen : null;
	});

	protected readonly diaSemana = computed(() => this.hubContext.slot()?.diaSemana ?? null);
	protected readonly diaSemanaDescripcion = computed(() => this.hubContext.slot()?.diaSemanaDescripcion ?? null);
	// #endregion

	constructor() {
		// Se carga una vez por franja: si el store ya tiene la lista de esta franja (volvió de otra pestaña)
		// se conserva tal cual —con sus ediciones— y la fecha pasa a ser la de esa lista.
		effect(() => {
			const id = this.slotId();
			if (id === null) return;
			untracked(() => this.loadForSlot(id));
		});
	}

	// #region Carga
	private loadForSlot(horarioId: number): void {
		const cargado = this.vm().registroData;
		if (cargado?.horarioId === horarioId) {
			this.fecha.set(cargado.fecha);
			return;
		}
		// Otra franja (o nada): se descarta lo suyo, incluido el resumen y su error, y se pide la de esta.
		this.facade.resetAsistencia();
		const fecha = this.fecha() ?? todayIso();
		this.fecha.set(fecha);
		this.facade.loadRegistro(fecha, horarioId);
	}

	private readFechaQuery(): string | null {
		const raw = this.route.snapshot.queryParamMap.get('fecha');
		return raw && FECHA_FORMAT.test(raw) ? raw : null;
	}
	// #endregion

	// #region Handlers
	protected onFechaChange(fecha: string): void {
		this.fecha.set(fecha);
		const id = this.slotId();
		if (id !== null) this.facade.loadRegistro(fecha, id);
	}

	protected onEstadoChange(event: { estudianteId: number; estado: EstadoAsistenciaCurso }): void {
		this.facade.setEstudianteEstado(event.estudianteId, event.estado);
	}

	protected onJustificacionChange(event: { estudianteId: number; justificacion: string | null }): void {
		this.facade.setEstudianteJustificacion(event.estudianteId, event.justificacion);
	}

	protected onSave(): void {
		const id = this.slotId();
		if (id !== null) this.facade.registrar(id);
	}

	protected onBuscarResumen(event: { fechaInicio: string; fechaFin: string }): void {
		const id = this.slotId();
		if (id !== null) this.facade.loadResumen(event.fechaInicio, event.fechaFin, id);
	}
	// #endregion
}
