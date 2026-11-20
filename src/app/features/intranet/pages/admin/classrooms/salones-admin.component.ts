import { Component, ChangeDetectionStrategy, inject, OnInit, computed, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { PageHeaderComponent, PeriodToggleComponent } from '@intranet-shared/components';
import { ClassroomsAdminFacade } from './services';
import { ClassroomsAdminTableComponent } from './components/salones-admin-table/salones-admin-table.component';
import { ConfigGradeDialogComponent } from './components/config-calificacion-dialog/config-calificacion-dialog.component';
import { ClosePeriodDialogComponent } from './components/cerrar-periodo-dialog/cerrar-periodo-dialog.component';
import { ClassroomDetailDialogComponent } from './components/salon-detail-dialog/salon-detail-dialog.component';
import {
	NivelEducativo,
	NIVELES,
	CrearConfiguracionCalificacionDto,
	ActualizarConfiguracionCalificacionDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
	CrearSalonDto,
} from './models';
import { NuevoSalonDialogComponent } from './components/nuevo-salon-dialog/nuevo-salon-dialog.component';
import { environment } from '@config/environment';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduMenu, type EduMenuItem, EduMessageService, EduToast, EduTooltip } from '@edu-ui';
@Component({
	selector: 'app-classrooms-admin',
	standalone: true,
	imports: [
		EduButton,
		EduMenu,
		EduTooltip,
		EduToast,
		EduConfirmDialog,
		PageHeaderComponent,
		PeriodToggleComponent,
		ClassroomsAdminTableComponent,
		ConfigGradeDialogComponent,
		ClosePeriodDialogComponent,
		ClassroomDetailDialogComponent,
		NuevoSalonDialogComponent],
	providers: [EduMessageService, EduConfirmationService],
	templateUrl: './salones-admin.component.html',
	styleUrl: './salones-admin.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomsAdminComponent implements OnInit {
	// #region Dependencias
	private facade = inject(ClassroomsAdminFacade);
	private router = inject(Router);
	private confirmationService = inject(EduConfirmationService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Computed — brief 436
	/** Salones candidatos como destino de transferencia: todos menos el actualmente abierto. */
	readonly salonesDisponibles = computed(() => {
		const actualId = this.vm().selectedSalonId;
		return this.vm()
			.salones.filter((s) => s.id !== actualId)
			.map((s) => ({ id: s.id, label: `${s.grado} ${s.seccion} — ${s.sede}` }));
	});
	// #endregion

	// #region Subtítulo con totales (Aprobados/Desaprobados/Pendientes viven en la vista Notas de la tabla)
	readonly subtitle = computed(() => {
		const { statsReady, estadisticas } = this.vm();
		if (!statsReady) return 'Administra los salones y su capacidad para el periodo académico';
		return `${estadisticas.totalSalones} salones · ${estadisticas.totalEstudiantes} estudiantes`;
	});
	// #endregion

	// #region Menú de periodo (estado + config + cierre)
	private readonly periodMenu = viewChild<EduMenu>('periodMenu');

	/** Estado y tipo de calificación del nivel activo, p. ej. «Periodo abierto · Numérico». */
	readonly periodLabel = computed(() => {
		const { periodoActual, periodoCerrado, configActual } = this.vm();
		const estado = !periodoActual ? 'Sin periodo' : periodoCerrado ? 'Periodo cerrado' : 'Periodo abierto';
		if (!configActual) return estado;
		return `${estado} · ${configActual.tipoCalificacion === 'NUMERICO' ? 'Numérico' : 'Literal'}`;
	});

	readonly periodMenuItems = computed<EduMenuItem[]>(() => {
		const { periodoActual, periodoCerrado } = this.vm();
		const items: EduMenuItem[] = [
			{ label: 'Configurar calificaciones', icon: 'pi pi-cog', command: () => this.onOpenConfigDialog() },
		];
		if (periodoActual && !periodoCerrado) {
			items.push({ label: 'Cerrar periodo…', icon: 'pi pi-lock', command: () => this.onOpenCerrarPeriodo() });
		}
		if (this.testTools && periodoActual && periodoCerrado) {
			items.push({
				label: 'Reabrir periodo (dev)',
				icon: 'pi pi-lock-open',
				command: () => this.onReabrirPeriodoDev(periodoActual.id),
			});
		}
		return items;
	});

	onTogglePeriodMenu(event: Event): void {
		this.periodMenu()?.toggle(event);
	}
	// #endregion

	// #region Estado local
	/** Herramientas de QA: solo true en environment.development. */
	readonly testTools = environment.debug.testTools;
	readonly niveles = NIVELES;
	readonly anioMin = 2020;
	readonly anioMax = 2030;
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers — barra de contexto
	onNivelChange(nivel: NivelEducativo): void {
		if (nivel !== this.vm().selectedNivel) {
			this.facade.setNivel(nivel);
		}
	}

	onAnioStep(delta: -1 | 1): void {
		const anio = this.vm().filtroAnio + delta;
		if (anio >= this.anioMin && anio <= this.anioMax) {
			this.facade.setAnio(anio);
		}
	}

	onRefresh(): void {
		this.facade.loadAll();
	}

	onPeriodoChange(esVerano: boolean): void {
		this.facade.setEsVerano(esVerano);
	}
	// #endregion

	// #region Event handlers — Salones
	onSelectSalon(salonId: number): void {
		this.facade.openSalonDialog(salonId);
	}

	onGoToHorarios(salonId: number): void {
		this.router.navigate(['/intranet/admin/horarios'], { queryParams: { salonId } });
	}

	onGoToUsuarios(salonId: number): void {
		this.router.navigate(['/intranet/admin/usuarios'], { queryParams: { salonId } });
	}
	// #endregion

	// #region Event handlers — Nuevo salón
	onOpenNuevoSalonDialog(): void {
		this.facade.openNuevoSalonDialog();
	}

	onNuevoSalonDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeNuevoSalonDialog();
		}
	}

	onCrearSalon(dto: CrearSalonDto): void {
		this.facade.crearSalon(dto);
	}
	// #endregion

	// #region Event handlers — Config dialog
	onOpenConfigDialog(): void {
		this.facade.openConfigDialog();
	}

	onConfigDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeConfigDialog();
		}
	}

	onCrearConfig(dto: CrearConfiguracionCalificacionDto): void {
		this.facade.crearConfiguracion(dto);
	}

	onActualizarConfig(event: { id: number; dto: ActualizarConfiguracionCalificacionDto }): void {
		this.facade.actualizarConfiguracion(event.id, event.dto);
	}
	// #endregion

	// #region Event handlers — Cerrar periodo
	onOpenCerrarPeriodo(): void {
		this.facade.openCerrarPeriodoDialog();
	}

	onCerrarPeriodoDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeCerrarPeriodoDialog();
		}
	}

	onConfirmarCierrePeriodo(periodoId: number): void {
		this.facade.cerrarPeriodo(periodoId);
	}

	/** DEV-ONLY: reabrir periodo cerrado (BD TEST). */
	onReabrirPeriodoDev(periodoId: number): void {
		this.confirmationService.confirm({
			header: 'Reabrir periodo (dev)',
			message:
				'Herramienta solo para QA en BD de prueba. Se reabrirá el periodo saltando la regla de cierre irreversible. Los salones del año siguiente creados al cerrar no se eliminan. ¿Continuar?',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				if (this.vm().loading) return;
				this.facade.reabrirPeriodoDev(periodoId);
			},
		});
	}
	// #endregion

	// #region Event handlers — Salon detail dialog
	onSalonDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeSalonDialog();
		}
	}

	onAprobarEstudiante(dto: AprobarEstudianteDto): void {
		this.facade.aprobarEstudiante(dto);
	}

	onAprobarMasivo(dto: AprobacionMasivaDto): void {
		this.facade.aprobarMasivo(dto);
	}

	onLoadAsistencia(event: { grado: string; seccion: string; mes: number; anio: number }): void {
		this.facade.loadAsistenciaSalon(event.grado, event.seccion, event.mes, event.anio);
	}

	onLoadNotas(event: { salonId: number; cursoId: number }): void {
		this.facade.loadNotasSalon(event.salonId, event.cursoId);
	}
	// #endregion
}
