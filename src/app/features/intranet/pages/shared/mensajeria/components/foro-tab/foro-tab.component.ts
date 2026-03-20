import { Component, ChangeDetectionStrategy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { GrupoContenidoDto } from '@features/intranet/pages/profesor/models';
import { CrearConversacionDto } from '@data/models';
import { SalonMensajeriaFacade } from '../../services/mensajeria.facade';

@Component({
	selector: 'app-salon-foro-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, MultiSelectModule, Select, TagModule, ProgressSpinnerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './foro-tab.component.html',
	styleUrl: './foro-tab.component.scss',
})
export class SalonForoTabComponent {
	// #region Dependencias
	private readonly facade = inject(SalonMensajeriaFacade);
	// #endregion

	// #region Inputs
	readonly estudiantes = input<{ label: string; value: string }[]>([]);
	readonly grupos = input<GrupoContenidoDto[]>([]);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly readOnly = input<boolean>(false);
	readonly salonDescripcion = input<string>('');
	readonly estudiantesDni = input<string[]>([]);
	// #endregion

	// #region Estado
	readonly vm = this.facade.foroVm;
	readonly nuevoMensaje = signal('');
	readonly selectedDestinatarios = signal<string[]>([]);
	readonly selectedHorarioId = signal<number | null>(null);
	readonly initialized = signal(false);
	// #endregion

	// #region Auto-select
	readonly showCursoSelector = computed(() => this.cursoOptions().length > 1);
	readonly singleCursoLabel = computed(() => {
		const options = this.cursoOptions();
		return options.length === 1 ? options[0].label : null;
	});

	constructor() {
		effect(() => {
			const options = this.cursoOptions();
			if (options.length === 1 && !this.initialized()) {
				this.onCursoChange(options[0].value);
			}
		});
	}
	// #endregion

	// #region Computed
	/** Opciones agrupadas por grupo para el multiselect */
	readonly destinatarioOptions = computed(() => {
		const gruposData = this.grupos();
		const estudiantesData = this.estudiantes();

		if (gruposData.length === 0) {
			return estudiantesData;
		}

		const grupoItems = gruposData
			.filter((g) => g.estudiantes.length > 0)
			.map((g) => ({
				label: g.nombre,
				items: g.estudiantes.map((e) => ({
					label: e.estudianteNombre,
					value: e.estudianteDni,
				})),
			}));

		return grupoItems;
	});

	readonly hasGrupos = computed(() => this.grupos().some((g) => g.estudiantes.length > 0));

	readonly isDirectedMessage = computed(() => this.selectedDestinatarios().length > 0);
	// #endregion

	// #region Helpers
	private readonly avatarColors = [
		'#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626',
		'#7c3aed', '#db2777', '#2563eb', '#ca8a04', '#0d9488',
	];

	getAvatarColor(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
	}
	// #endregion

	// #region Handlers
	onCursoChange(horarioId: number): void {
		this.selectedHorarioId.set(horarioId);
		this.initialized.set(true);
		this.facade.initForo(this.salonDescripcion(), this.estudiantesDni(), horarioId);
	}

	onRefresh(): void {
		this.facade.refreshForo();
	}

	onEnviar(): void {
		const contenido = this.nuevoMensaje().trim();
		if (!contenido) return;

		const destinatarios = this.selectedDestinatarios();
		const horarioId = this.selectedHorarioId() ?? undefined;

		if (destinatarios.length > 0) {
			const dto: CrearConversacionDto = {
				asunto: `Foro: ${contenido.substring(0, 50)}`,
				destinatariosDni: destinatarios,
				mensajeInicial: contenido,
				horarioId,
			};
			this.facade.crearConversacion(dto);
			this.selectedDestinatarios.set([]);
		} else {
			const foroId = this.vm().foroConversacionId;
			if (!foroId) return;
			this.facade.enviarMensaje(foroId, contenido);
		}

		this.nuevoMensaje.set('');
	}
	// #endregion
}
