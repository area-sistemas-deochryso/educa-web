// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';

import { UserPermissionsService } from '@core/services';
import { ErrorStateComponent } from '@shared/components';
import { SolicitudJustificacionAsistenciaDto, EstadoSolicitudJustificacion } from '@features/intranet/pages/estudiante/models';

import { JustificacionAsistenciaBandejaFacade } from './justificacion-asistencia-bandeja.facade';
import { EduConfirmDialog, EduConfirmationService, EduDialog, EduSelect, EduSpinner, EduTable, EduTag, EduTextarea } from '@edu-ui';
// #endregion

const JUSTIFICACION_ASISTENCIA_APROBAR = 'JUSTIFICACION_ASISTENCIA_APROBAR';

interface EstadoOption {
	label: string;
	value: EstadoSolicitudJustificacion | null;
}

const ESTADO_FILTRO_OPTIONS: EstadoOption[] = [
	{ label: 'Pendiente', value: 'PENDIENTE' },
	{ label: 'Aprobada', value: 'APROBADA' },
	{ label: 'Rechazada', value: 'RECHAZADA' },
	{ label: 'Todos', value: null }];

const ESTADO_SEVERITY: Record<EstadoSolicitudJustificacion, 'warn' | 'success' | 'danger'> = {
	PENDIENTE: 'warn',
	APROBADA: 'success',
	RECHAZADA: 'danger',
};

const ESTADO_LABEL: Record<EstadoSolicitudJustificacion, string> = {
	PENDIENTE: 'Pendiente',
	APROBADA: 'Aprobada',
	RECHAZADA: 'Rechazada',
};

/**
 * Bandeja de aprobación de justificaciones de inasistencia (Plan 101 F4).
 * Cross-role (Profesor ve solo sus horarios, roles administrativos ven todo
 * Secundaria) — el backend ya resuelve el scoping en `GET .../bandeja`, así
 * que este componente no branchea por rol (a diferencia de `AttendanceComponent`,
 * que sí tiene vistas genuinamente distintas por rol). Gate por capability a
 * nivel componente, mismo patrón que `TicketBandejaComponent.canAccess`.
 */
@Component({
	selector: 'app-justificacion-asistencia-bandeja',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, EduConfirmDialog, EduDialog, EduSpinner, EduSelect, EduTable, EduTag, EduTextarea, ErrorStateComponent],
	providers: [JustificacionAsistenciaBandejaFacade, EduConfirmationService],
	templateUrl: './justificacion-asistencia-bandeja.component.html',
	styleUrl: './justificacion-asistencia-bandeja.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustificacionAsistenciaBandejaComponent implements OnInit {
	// #region Dependencies
	private readonly facade = inject(JustificacionAsistenciaBandejaFacade);
	private readonly userPermisos = inject(UserPermissionsService);
	private readonly confirmationService = inject(EduConfirmationService);
	// #endregion

	// #region State
	readonly loading = this.facade.loading;
	readonly error = this.facade.error;
	readonly resolvingId = this.facade.resolvingId;

	readonly estadoFiltroOptions = ESTADO_FILTRO_OPTIONS;
	readonly canAccess = this.userPermisos.hasCapability(JUSTIFICACION_ASISTENCIA_APROBAR);

	private readonly _filtroEstado = signal<EstadoSolicitudJustificacion | null>('PENDIENTE');
	readonly filtroEstado = this._filtroEstado.asReadonly();
	readonly solicitudesFiltradas = computed(() => {
		const filtro = this._filtroEstado();
		const solicitudes = this.facade.solicitudes();
		return filtro ? solicitudes.filter((s) => s.estado === filtro) : solicitudes;
	});

	readonly rechazarDialogVisible = signal(false);
	readonly solicitudSeleccionada = signal<SolicitudJustificacionAsistenciaDto | null>(null);
	readonly motivoRechazo = signal('');
	// #endregion

	ngOnInit(): void {
		if (this.canAccess) this.facade.init();
	}

	// #region Handlers
	onRetry(): void {
		this.facade.init();
	}

	onFiltroChange(estado: EstadoSolicitudJustificacion | null): void {
		this._filtroEstado.set(estado);
	}

	onAprobar(solicitud: SolicitudJustificacionAsistenciaDto): void {
		this.confirmationService.confirm({
			header: 'Aprobar solicitud',
			message: `¿Aprobar la justificación de ${solicitud.estudianteNombre} para el ${solicitud.fecha}?`,
			acceptLabel: 'Aprobar',
			rejectLabel: 'Cancelar',
			icon: 'pi pi-check-circle',
			accept: () => this.facade.aprobar(solicitud),
		});
	}

	onAbrirRechazo(solicitud: SolicitudJustificacionAsistenciaDto): void {
		this.solicitudSeleccionada.set(solicitud);
		this.motivoRechazo.set('');
		this.rechazarDialogVisible.set(true);
	}

	onRechazarDialogVisibleChange(visible: boolean): void {
		this.rechazarDialogVisible.set(visible);
		if (!visible) this.solicitudSeleccionada.set(null);
	}

	onCancelarRechazo(): void {
		this.rechazarDialogVisible.set(false);
		this.solicitudSeleccionada.set(null);
	}

	onConfirmarRechazo(): void {
		const solicitud = this.solicitudSeleccionada();
		const motivo = this.motivoRechazo().trim();
		if (!solicitud || !motivo) return;

		this.facade.rechazar(solicitud, motivo, () => {
			this.rechazarDialogVisible.set(false);
			this.solicitudSeleccionada.set(null);
		});
	}
	// #endregion

	// #region Template helpers
	// El template tipa `let-solicitud` implícitamente como `any` (PrimeNG `p-table`
	// no propaga el genérico) — estos wrappers evitan indexar los `Record`
	// directamente desde el HTML con un valor `any` (TS7053).
	labelFor(estado: EstadoSolicitudJustificacion): string {
		return ESTADO_LABEL[estado];
	}

	severityFor(estado: EstadoSolicitudJustificacion): 'warn' | 'success' | 'danger' {
		return ESTADO_SEVERITY[estado];
	}
	// #endregion
}
