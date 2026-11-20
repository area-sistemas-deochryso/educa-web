import { Component, ChangeDetectionStrategy, computed, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { type ModoAsignacion, resolveModoAsignacion } from '@data/adapters';
import { CardActionsComponent, CardRowComponent, MobileCardListComponent, ModoAsignacionBadgeComponent, StickyFilterBarComponent, injectIsMobile } from '@shared/components';
import { createClientPaging } from '@shared/utils';
import type { SalonesAdminEstadisticas } from '@data/models';
import { SalonAdminListDto, PeriodoCierreEstado } from '../../models';
import { EduButton, EduInputText, EduMenu, type EduMenuItem, EduSelect, EduSelectButton, EduSortableColumn, EduTable, EduTag, EduTooltip } from '@edu-ui';

type Vista = 'docentes' | 'notas';

interface FilterOption<T> {
	label: string;
	value: T;
}

/** Normaliza para buscar sin distinguir mayúsculas ni tildes. */
const normalize = (text: string): string =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();

@Component({
	selector: 'app-classrooms-admin-table',
	standalone: true,
	imports: [
		FormsModule,
		MobileCardListComponent,
		CardRowComponent,
		CardActionsComponent,
		StickyFilterBarComponent,
		EduTable,
		EduButton,
		EduTag,
		EduInputText,
		EduSelect,
		EduSelectButton,
		ModoAsignacionBadgeComponent,
		EduTooltip,
		EduSortableColumn,
		EduMenu,
	],
	templateUrl: './salones-admin-table.component.html',
	styleUrl: './salones-admin-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomsAdminTableComponent {
	// #region Inputs / Outputs
	readonly salones = input.required<SalonAdminListDto[]>();
	readonly loading = input(false);
	/** Totales del nivel; en la vista Notas se muestran aprobados/desaprobados/pendientes. */
	readonly estadisticas = input<SalonesAdminEstadisticas | null>(null);
	readonly isMobile = injectIsMobile();

	readonly selectSalon = output<number>();
	readonly goToHorarios = output<number>();
	readonly goToUsuarios = output<number>();
	// #endregion

	// #region Vista (tab switcher): docentes = salón + tutor · notas = salón + estudiantes y notas
	readonly vista = signal<Vista>('docentes');
	readonly vistaOptions: FilterOption<Vista>[] = [
		{ label: 'Docentes', value: 'docentes' },
		{ label: 'Notas', value: 'notas' },
	];

	onVistaChange(value: unknown): void {
		this.vista.set(value === 'notas' ? 'notas' : 'docentes');
	}
	// #endregion

	// #region Búsqueda y filtros (client-side, la lista ya está en memoria)
	/** Los selects viven en un panel plegable; arranca cerrado para no gastar una banda de la página. */
	readonly filtersOpen = signal(false);
	readonly searchTerm = signal('');
	readonly filterSede = signal<string | null>(null);
	readonly filterModo = signal<ModoAsignacion | null>(null);
	readonly filterTutor = signal<'con' | 'sin' | null>(null);
	readonly filterPeriodo = signal<string | null>(null);

	readonly modoOptions: FilterOption<ModoAsignacion | null>[] = [
		{ label: 'Todos los modos', value: null },
		{ label: 'Tutor pleno', value: 'TutorPleno' },
		{ label: 'Por curso', value: 'PorCurso' },
		{ label: 'Flexible', value: 'Flexible' },
	];
	readonly tutorOptions: FilterOption<'con' | 'sin' | null>[] = [
		{ label: 'Todos los tutores', value: null },
		{ label: 'Con tutor', value: 'con' },
		{ label: 'Sin tutor', value: 'sin' },
	];
	readonly periodoOptions: FilterOption<string | null>[] = [
		{ label: 'Todos los periodos', value: null },
		{ label: 'Abierto', value: 'ABIERTO' },
		{ label: 'Cerrado', value: 'CERRADO' },
		{ label: 'Sin periodo', value: 'SIN_PERIODO' },
	];
	readonly sedeOptions = computed<FilterOption<string | null>[]>(() => {
		const sedes = [...new Set(this.salones().map((s) => s.sede).filter(Boolean))].sort();
		return [{ label: 'Todas las sedes', value: null }, ...sedes.map((sede) => ({ label: sede, value: sede }))];
	});

	/** Filtros activos sin contar el buscador (lo muestra el botón «Filtros» de la barra compacta). */
	readonly activeFilterCount = computed(
		() => [this.filterSede(), this.filterModo(), this.filterTutor(), this.filterPeriodo()].filter((v) => v !== null).length,
	);

	private readonly filtered = computed(() => {
		const term = normalize(this.searchTerm().trim());
		const sede = this.filterSede();
		const modo = this.filterModo();
		const tutor = this.filterTutor();
		const periodo = this.filterPeriodo();

		return this.salones().filter((s) => {
			if (sede && s.sede !== sede) return false;
			if (modo && this.getModoAsignacion(s) !== modo) return false;
			if (tutor === 'con' && !s.tutorNombre) return false;
			if (tutor === 'sin' && s.tutorNombre) return false;
			if (periodo && s.estadoPeriodo !== periodo) return false;
			if (!term) return true;
			return normalize(`${s.grado} ${s.seccion} ${s.sede} ${s.tutorNombre ?? ''}`).includes(term);
		});
	});

	/** Paginación client-side compartida por la tabla y las cards móviles. */
	readonly paging = createClientPaging(this.filtered);

	toggleFilters(): void {
		this.filtersOpen.update((open) => !open);
	}

	onSearchTermChange(term: string): void {
		this.searchTerm.set(term);
		this.resetPage();
	}

	onFilterSedeChange(value: string | null): void {
		this.filterSede.set(value);
		this.resetPage();
	}

	onFilterModoChange(value: ModoAsignacion | null): void {
		this.filterModo.set(value);
		this.resetPage();
	}

	onFilterTutorChange(value: 'con' | 'sin' | null): void {
		this.filterTutor.set(value);
		this.resetPage();
	}

	onFilterPeriodoChange(value: string | null): void {
		this.filterPeriodo.set(value);
		this.resetPage();
	}

	clearFilters(): void {
		this.searchTerm.set('');
		this.filterSede.set(null);
		this.filterModo.set(null);
		this.filterTutor.set(null);
		this.filterPeriodo.set(null);
		this.resetPage();
	}

	/** Tras filtrar, volver a la primera página para no quedar en una página que ya no existe. */
	private resetPage(): void {
		this.paging.onPageChange({ first: 0, rows: this.paging.rows(), page: 0, pageCount: 1 });
	}
	// #endregion

	// #region Menú de acciones secundarias (un solo menú compartido por todas las filas)
	private readonly rowMenu = viewChild<EduMenu>('rowMenu');
	private readonly menuSalonId = signal<number | null>(null);

	readonly rowMenuItems = computed<EduMenuItem[]>(() => [
		{ label: 'Ver horarios', icon: 'pi pi-calendar', command: () => this.emitForMenuSalon(this.goToHorarios) },
		{ label: 'Ver usuarios', icon: 'pi pi-users', command: () => this.emitForMenuSalon(this.goToUsuarios) },
	]);

	openRowMenu(event: Event, salonId: number): void {
		this.menuSalonId.set(salonId);
		this.rowMenu()?.toggle(event);
	}

	private emitForMenuSalon(target: { emit: (id: number) => void }): void {
		const id = this.menuSalonId();
		if (id !== null) target.emit(id);
	}
	// #endregion

	// #region Helpers
	getEstadoPeriodoSeverity(estado: PeriodoCierreEstado | string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
		switch (estado) {
			case 'CERRADO':
				return 'success';
			case 'ABIERTO':
				return 'info';
			case 'SIN_PERIODO':
				return 'warn';
			default:
				return 'secondary';
		}
	}

	getEstadoPeriodoLabel(estado: PeriodoCierreEstado | string): string {
		switch (estado) {
			case 'CERRADO':
				return 'Cerrado';
			case 'ABIERTO':
				return 'Abierto';
			case 'SIN_PERIODO':
				return 'Sin periodo';
			default:
				return estado;
		}
	}

	getModoAsignacion(salon: SalonAdminListDto): ModoAsignacion {
		return resolveModoAsignacion(salon.gradoOrden, salon.seccion);
	}
	// #endregion
}
