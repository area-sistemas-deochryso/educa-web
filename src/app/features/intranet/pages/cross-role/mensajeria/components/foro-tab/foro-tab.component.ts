import { Component, ChangeDetectionStrategy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrupoContenidoDto } from '@features/intranet/pages/profesor/models';
import { CrearConversacionDto } from '@data/models';
import { getInitial } from '@core/helpers';
import { SalonMensajeriaFacade } from '../../services/mensajeria.facade';
import { EduButton, EduInputText, EduMultiSelect, EduSelect, EduSpinner, EduTag } from '@edu-ui';

@Component({
	selector: 'app-salon-foro-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, EduButton, EduInputText, EduMultiSelect, EduSelect, EduTag, EduSpinner],
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
			const currentId = this.selectedHorarioId();
			const isCurrentStillValid = currentId !== null && options.some((o) => o.value === currentId);

			// El curso ya cargado sigue siendo válido para el set de opciones
			// actual (ej: sin cambios, o recomputo que no afecta la selección) —
			// no reiniciar el foro ya cargado.
			if (isCurrentStillValid) return;

			// `cursoOptions` cambió a un set que no incluye la selección previa
			// (ej: profesor/foro cambia de salón, reusando la MISMA instancia de
			// este componente vía @if). Sin este reset, `initialized` queda en
			// `true` para siempre y el foro del salón nuevo nunca se carga —
			// cero requests, spinner/estado viejo indefinido (brief 513).
			this.initialized.set(false);
			this.selectedHorarioId.set(null);

			if (options.length === 1) {
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
	readonly getInitial = getInitial;

	private readonly avatarColors = [
		'#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626',
		'#7c3aed', '#db2777', '#2563eb', '#ca8a04', '#0d9488'];

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
