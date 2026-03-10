import { Component, ChangeDetectionStrategy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CrearConversacionDto } from '../../../models';
import { SalonMensajeriaFacade } from '../../services/salon-mensajeria.facade';

// Avatar colors palette (WCAG AA contrast with white text)
const AVATAR_COLORS = [
	'#4f46e5',
	'#0891b2',
	'#059669',
	'#d97706',
	'#dc2626',
	'#7c3aed',
	'#db2777',
	'#2563eb',
	'#ca8a04',
	'#0d9488',
];

@Component({
	selector: 'app-salon-mensajeria-tab',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		InputTextModule,
		DialogModule,
		Select,
		TagModule,
		ProgressSpinnerModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salon-mensajeria-tab.component.html',
	styleUrl: './salon-mensajeria-tab.component.scss',
})
export class SalonMensajeriaTabComponent {
	// #region Dependencias
	private readonly facade = inject(SalonMensajeriaFacade);
	// #endregion

	// #region Inputs
	readonly estudiantes = input<{ label: string; value: string }[]>([]);
	readonly isFullscreen = input<boolean>(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.mensajeriaVm;
	// #endregion

	// #region Estado local
	readonly nuevoMensaje = signal('');
	readonly nuevaConversacionVisible = signal(false);
	readonly selectedEstudianteDni = signal('');
	readonly nuevoAsunto = signal('');
	readonly nuevoContenido = signal('');
	readonly selectedHorarioId = signal<number | null>(null);
	readonly initialized = signal(false);
	// #endregion

	// #region Computed
	readonly showCursoSelector = computed(() => this.cursoOptions().length > 1);
	readonly singleCursoLabel = computed(() => {
		const options = this.cursoOptions();
		return options.length === 1 ? options[0].label : null;
	});

	/** Use input students if provided (profesor), otherwise fall back to API destinatarios */
	readonly resolvedEstudiantes = computed(() => {
		const fromInput = this.estudiantes();
		if (fromInput.length > 0) return fromInput;
		return this.vm().destinatarios.map((d) => ({ label: d.nombre, value: d.dni }));
	});

	readonly canCreate = computed(
		() =>
			!!this.selectedEstudianteDni() &&
			!!this.nuevoAsunto().trim() &&
			!!this.nuevoContenido().trim(),
	);

	readonly conversacionesView = computed(() =>
		this.vm().conversaciones.map((c) => ({
			...c,
			inicial: this.getInicial(c.asunto),
			avatarColor: this.getColorFromName(c.asunto),
		})),
	);
	// #endregion

	// #region Auto-select
	constructor() {
		effect(() => {
			const options = this.cursoOptions();
			if (options.length === 1 && !this.initialized()) {
				this.onCursoChange(options[0].value);
			}
		});
	}
	// #endregion

	// #region List handlers
	onCursoChange(horarioId: number): void {
		this.selectedHorarioId.set(horarioId);
		this.initialized.set(true);
		this.facade.loadConversaciones(horarioId, true);
	}

	onSelectConversacion(id: number): void {
		this.facade.openConversacion(id);
	}

	onBack(): void {
		this.facade.backToList();
	}

	onRefreshLista(): void {
		this.facade.loadConversaciones(this.selectedHorarioId() ?? undefined, true);
	}

	onRefreshDetalle(): void {
		const id = this.vm().detalle?.id;
		if (id) this.facade.openConversacion(id);
	}
	// #endregion

	// #region Message handlers
	onEnviar(): void {
		const contenido = this.nuevoMensaje().trim();
		const id = this.vm().detalle?.id;
		if (!contenido || !id) return;

		this.facade.enviarMensaje(id, contenido);
		this.nuevoMensaje.set('');
	}
	// #endregion

	// #region New conversation handlers
	onNuevoMensaje(): void {
		this.nuevaConversacionVisible.set(true);
	}

	onNuevoDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.nuevaConversacionVisible.set(false);
			this.resetNuevoForm();
		}
	}

	onCancelarNuevo(): void {
		this.nuevaConversacionVisible.set(false);
		this.resetNuevoForm();
	}

	onCrearConversacion(): void {
		const dto: CrearConversacionDto = {
			asunto: this.nuevoAsunto().trim(),
			destinatariosDni: [this.selectedEstudianteDni()],
			mensajeInicial: this.nuevoContenido().trim(),
			horarioId: this.selectedHorarioId() ?? undefined,
		};

		this.facade.crearConversacion(dto);
		this.nuevaConversacionVisible.set(false);
		this.resetNuevoForm();
	}
	// #endregion

	// #region Helpers privados
	private resetNuevoForm(): void {
		this.selectedEstudianteDni.set('');
		this.nuevoAsunto.set('');
		this.nuevoContenido.set('');
	}

	private getInicial(asunto: string): string {
		return asunto.charAt(0).toUpperCase();
	}

	private getColorFromName(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
	}
	// #endregion
}
