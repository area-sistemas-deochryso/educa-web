import {
	Component,
	ChangeDetectionStrategy,
	computed,
	inject,
	signal,
	OnInit,
	OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@shared/components';
import { ProfesorFacade } from '../services/profesor.facade';
import { SalonMensajeriaFacade } from '@features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade';
import { SalonForoTabComponent } from '@features/intranet/pages/cross-role/mensajeria/components/foro-tab/foro-tab.component';
import { GruposFacade } from '../classrooms/services/grupos.facade';
import { ProfesorSalonConEstudiantes } from '../services/profesor.store';
import { toSelectOptionsFrom } from '@shared/models';

@Component({
	selector: 'app-profesor-foro',
	standalone: true,
	imports: [CommonModule, FormsModule, Select, ProgressSpinnerModule, PageHeaderComponent, SalonForoTabComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
		.page-container {
			display: flex;
			flex-direction: column;
		}
		.filters-row {
			display: flex;
			align-items: center;
			gap: 1rem;
			flex-wrap: wrap;
		}
	`,
	template: `
		<app-page-header icon="pi pi-megaphone" title="Foro" />
		<div class="page-container p-4 pt-0">

			@if (loading()) {
				<div class="flex justify-content-center p-5">
					<p-progressSpinner strokeWidth="4" />
				</div>
			} @else if (salonOptions().length === 0) {
				<div class="flex flex-column align-items-center p-5 text-color-secondary">
					<i class="pi pi-megaphone text-4xl mb-3"></i>
					<p>No tienes salones asignados</p>
				</div>
			} @else {
				<div class="filters-row mb-3">
					<p-select
						[options]="salonOptions()"
						[(ngModel)]="selectedSalonId"
						placeholder="Seleccionar salón"
						appendTo="body"
						(ngModelChange)="onSalonChange($event)"
					/>
				</div>

				@if (selectedSalon()) {
					<app-salon-foro-tab
						[cursoOptions]="cursoOptions()"
						[salonDescripcion]="selectedSalon()!.salonDescripcion"
						[estudiantes]="estudiantesOptions()"
						[estudiantesDni]="estudiantesDni()"
						[grupos]="gruposData()"
					/>
				}
			}
		</div>
	`,
})
export class ProfesorForoComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly mensajeriaFacade = inject(SalonMensajeriaFacade);
	private readonly gruposFacade = inject(GruposFacade);
	// #endregion

	// #region Estado local
	selectedSalonId = signal<number | null>(null);
	// #endregion

	// #region Computed
	readonly loading = computed(() => this.facade.vm().loading);

	readonly salonOptions = computed(() =>
		toSelectOptionsFrom(this.facade.vm().salonesConEstudiantes, 'salonDescripcion', 'salonId'),
	);

	readonly selectedSalon = computed<ProfesorSalonConEstudiantes | null>(() => {
		const id = this.selectedSalonId();
		if (!id) return null;
		return this.facade.vm().salonesConEstudiantes.find((s) => s.salonId === id) ?? null;
	});

	readonly cursoOptions = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		return toSelectOptionsFrom(salon.cursos, 'nombre', 'horarioId');
	});

	readonly estudiantesOptions = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		return toSelectOptionsFrom(salon.estudiantes, 'nombreCompleto', 'dni');
	});

	readonly estudiantesDni = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		return salon.estudiantes.map((e) => e.dni);
	});

	readonly gruposData = computed(() => this.gruposFacade.vm().grupos);
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		if (this.facade.vm().horarios.length === 0) {
			this.facade.loadData();
		}
	}

	ngOnDestroy(): void {
		this.mensajeriaFacade.reset();
		this.gruposFacade.resetGrupos();
	}
	// #endregion

	// #region Handlers
	onSalonChange(salonId: number): void {
		this.selectedSalonId.set(salonId);

		const salon = this.facade.vm().salonesConEstudiantes.find((s) => s.salonId === salonId);
		if (salon && salon.cursos.length > 0) {
			this.gruposFacade.loadGruposForHorario(salon.cursos[0].horarioId);
		}
	}
	// #endregion
}
