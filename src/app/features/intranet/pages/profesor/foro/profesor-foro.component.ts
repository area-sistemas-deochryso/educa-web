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
import { ProfesorFacade } from '../services/profesor.facade';
import { SalonMensajeriaFacade } from '../salones/services/salon-mensajeria.facade';
import { SalonForoTabComponent } from '../salones/components/salon-foro-tab/salon-foro-tab.component';
import { GruposFacade } from '../salones/services/grupos.facade';
import { ProfesorSalonConEstudiantes } from '../services/profesor.store';

@Component({
	selector: 'app-profesor-foro',
	standalone: true,
	imports: [CommonModule, FormsModule, Select, ProgressSpinnerModule, SalonForoTabComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
			height: calc(100vh - 120px);
		}
		.page-container {
			height: 100%;
			display: flex;
			flex-direction: column;
		}
		.filters-row {
			display: flex;
			align-items: center;
			gap: 1rem;
			flex-wrap: wrap;
		}
		.tab-wrapper {
			flex: 1;
			min-height: 0;
		}
	`,
	template: `
		<div class="page-container p-4">
			<h2 class="mt-0 mb-3">Foro</h2>

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
					<div class="tab-wrapper">
						<app-salon-foro-tab
							[cursoOptions]="cursoOptions()"
							[salonDescripcion]="selectedSalon()!.salonDescripcion"
							[estudiantes]="estudiantesOptions()"
							[estudiantesDni]="estudiantesDni()"
							[grupos]="gruposData()"
						/>
					</div>
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

	readonly salonOptions = computed(() => {
		const salones = this.facade.vm().salonesConEstudiantes;
		return salones.map((s) => ({ label: s.salonDescripcion, value: s.salonId }));
	});

	readonly selectedSalon = computed<ProfesorSalonConEstudiantes | null>(() => {
		const id = this.selectedSalonId();
		if (!id) return null;
		return this.facade.vm().salonesConEstudiantes.find((s) => s.salonId === id) ?? null;
	});

	readonly cursoOptions = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		return salon.cursos.map((c) => ({ label: c.nombre, value: c.horarioId }));
	});

	readonly estudiantesOptions = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		return salon.estudiantes.map((e) => ({ label: e.nombreCompleto, value: e.dni }));
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
			this.gruposFacade.loadGruposForSalonCurso(salonId, salon.cursos[0].horarioId);
		}
	}
	// #endregion
}
