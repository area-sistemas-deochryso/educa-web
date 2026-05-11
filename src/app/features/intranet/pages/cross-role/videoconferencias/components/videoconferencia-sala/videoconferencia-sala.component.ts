// #region Imports
import {
	Component,
	ChangeDetectionStrategy,
	inject,
	OnInit,
	OnDestroy,
	ElementRef,
	viewChild,
	signal,
	input,
	computed,
	HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { logger } from '@core/helpers';
import { VideoconferenciasFacade } from '../../services/videoconferencias.facade';
import {
	JitsiApi,
	MODERATOR_TOOLBAR_BUTTONS,
	PARTICIPANT_TOOLBAR_BUTTONS,
	ParticipantInfo,
	countStaff,
	countTeachers,
	normalizeName,
} from './jitsi-api.types';

// #endregion

declare const JitsiMeetExternalAPI: new (domain: string, options: Record<string, unknown>) => JitsiApi;

@Component({
	selector: 'app-videoconferencia-sala',
	standalone: true,
	imports: [CommonModule, ButtonModule, ProgressSpinnerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './videoconferencia-sala.component.html',
	styleUrl: './videoconferencia-sala.component.scss',
})
export class VideoconferenciaSalaComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly facade = inject(VideoconferenciasFacade);
	private readonly hostEl = inject(ElementRef);
	// #endregion

	// #region Inputs
	readonly roomName = input.required<string>();
	readonly cursoNombre = input.required<string>();
	readonly profesorNombreCompleto = input<string | null>(null);
	// #endregion

	// #region Estado local
	readonly jitsiContainer = viewChild<ElementRef<HTMLDivElement>>('jitsiContainer');
	readonly connecting = signal(true);
	readonly connectingStep = signal<'auth' | 'script' | 'joining'>('auth');
	readonly errorMsg = signal<string | null>(null);
	readonly isFullscreen = signal(false);
	readonly syncingParticipants = signal(false);

	private jitsiApi: JitsiApi | null = null;
	// #endregion

	// #region Participantes
	private readonly _participants = signal<Map<string, ParticipantInfo>>(new Map());
	private readonly _selfJoined = signal(false);

	readonly totalParticipants = computed(() => {
		const count = this._participants().size;
		return this._selfJoined() ? count + 1 : count;
	});

	private readonly profesorNormalized = computed(() => normalizeName(this.profesorNombreCompleto()));

	readonly teacherCount = computed(() =>
		countTeachers(
			this._participants(),
			this.profesorNormalized(),
			this._selfJoined() && this.facade.isProfesor(),
		),
	);

	readonly staffCount = computed(() =>
		countStaff(
			this._participants(),
			this.profesorNormalized(),
			this._selfJoined() && this.facade.isModerator() && !this.facade.isProfesor(),
		),
	);

	readonly studentCount = computed(
		() => this.totalParticipants() - this.teacherCount() - this.staffCount(),
	);
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.fetchTokenAndLoad();
	}

	ngOnDestroy(): void {
		this.exitFullscreen();
		this.disposeJitsi();
	}
	// #endregion

	// #region Event handlers
	onVolver(): void {
		this.exitFullscreen();
		this.disposeJitsi();
		this.facade.leaveSala();
	}

	onToggleFullscreen(): void {
		if (this.isFullscreen()) {
			this.exitFullscreen();
		} else {
			this.enterFullscreen();
		}
	}

	onRefreshParticipants(): void {
		this.syncParticipantRoles();
	}

	/** Sincronizar signal cuando el usuario sale con ESC o F11 */
	@HostListener('document:fullscreenchange')
	onFullscreenChange(): void {
		this.isFullscreen.set(!!document.fullscreenElement);
	}
	// #endregion

	// #region Fullscreen
	private enterFullscreen(): void {
		const el = this.hostEl.nativeElement as HTMLElement;
		el.requestFullscreen?.().catch(() => {
			// Fallback silencioso si el navegador bloquea fullscreen
		});
	}

	private exitFullscreen(): void {
		if (document.fullscreenElement) {
			document.exitFullscreen?.().catch(() => {});
		}
	}
	// #endregion

	// #region Jitsi integration
	/** Obtiene JWT + appId del backend antes de cargar el script de JaaS */
	private fetchTokenAndLoad(): void {
		this.connectingStep.set('auth');
		this.facade.getJaaSToken(this.roomName()).subscribe({
			next: (response) => {
				if (!response.appId) {
					this.errorMsg.set('Servicio de videoconferencia no configurado');
					this.connecting.set(false);
					return;
				}
				this.connectingStep.set('script');
				this.loadJitsiScript(response.appId, response.jwt);
			},
			error: () => {
				this.errorMsg.set('No se pudo obtener acceso a la sala');
				this.connecting.set(false);
			},
		});
	}

	private loadJitsiScript(appId: string, jwt: string): void {
		const scriptUrl = `https://8x8.vc/${appId}/external_api.js`;

		if (typeof JitsiMeetExternalAPI !== 'undefined') {
			this.connectingStep.set('joining');
			this.initJitsi(appId, jwt);
			return;
		}

		const script = document.createElement('script');
		script.src = scriptUrl;
		script.async = true;
		script.onload = () => {
			this.connectingStep.set('joining');
			this.initJitsi(appId, jwt);
		};
		script.onerror = () => {
			this.errorMsg.set('No se pudo cargar el servicio de videoconferencia');
			this.connecting.set(false);
			logger.error('VideoconferenciaSala: Error al cargar script de JaaS');
		};
		document.head.appendChild(script);
	}

	private initJitsi(appId: string, jwt: string): void {
		const container = this.jitsiContainer()?.nativeElement;
		if (!container) {
			this.errorMsg.set('Error al inicializar la sala');
			this.connecting.set(false);
			return;
		}

		const isModerator = this.facade.isModerator();
		const displayName = this.facade.displayName();

		const toolbarButtons = isModerator ? MODERATOR_TOOLBAR_BUTTONS : PARTICIPANT_TOOLBAR_BUTTONS;

		try {
			// JaaS requiere roomName con formato: appId/roomName
			this.jitsiApi = new JitsiMeetExternalAPI('8x8.vc', {
				roomName: `${appId}/${this.roomName()}`,
				parentNode: container,
				jwt,
				width: '100%',
				height: '100%',
				lang: 'es',
				userInfo: {
					displayName: displayName || 'Participante',
				},
				configOverwrite: {
					startWithAudioMuted: true,
					startWithVideoMuted: true,
					prejoinPageEnabled: false,
					disableDeepLinking: true,
					toolbarButtons,
					enableClosePage: false,
					hideConferenceSubject: false,
					subject: this.cursoNombre(),
				},
				interfaceConfigOverwrite: {
					SHOW_JITSI_WATERMARK: false,
					SHOW_WATERMARK_FOR_GUESTS: false,
					SHOW_BRAND_WATERMARK: false,
					SHOW_CHROME_EXTENSION_BANNER: false,
					MOBILE_APP_PROMO: false,
					TOOLBAR_ALWAYS_VISIBLE: true,
					DEFAULT_BACKGROUND: '#1a1a2e',
				},
			});

			this.setupJitsiEvents();

			// Fallback: si no dispara "Joined" en 10s, ocultar spinner
			setTimeout(() => this.connecting.set(false), 10000);
		} catch (err) {
			logger.error('VideoconferenciaSala: Error al inicializar Jitsi', err);
			this.errorMsg.set('Error al inicializar la sala de videoconferencia');
			this.connecting.set(false);
		}
	}

	private setupJitsiEvents(): void {
		if (!this.jitsiApi) return;

		this.jitsiApi.addEventListener('videoConferenceJoined', () => {
			this.connecting.set(false);
			this._selfJoined.set(true);
			// Sincronizar roles de participantes ya presentes en la sala
			this.syncParticipantRoles(1500);
		});

		this.jitsiApi.addEventListener('videoConferenceLeft', () => {
			this.onVolver();
		});

		this.jitsiApi.addEventListener('readyToClose', () => {
			this.onVolver();
		});

		// Tracking de participantes remotos
		this.jitsiApi.addEventListener('participantJoined', (data: unknown) => {
			const { id, displayName } = data as { id: string; displayName: string };
			this._participants.update((map) => {
				const next = new Map(map);
				next.set(id, { displayName: displayName || '', isModerator: false });
				return next;
			});
			// Re-sync diferido: displayName puede llegar vacío y resolverse con un getParticipantsInfo posterior
			this.syncParticipantRoles(800);
		});

		this.jitsiApi.addEventListener('participantLeft', (data: unknown) => {
			const { id } = data as { id: string };
			this._participants.update((map) => {
				const next = new Map(map);
				next.delete(id);
				return next;
			});
		});

		// Jitsi emite role change cuando el JWT otorga moderator
		this.jitsiApi.addEventListener('participantRoleChanged', (data: unknown) => {
			const { id, role } = data as { id: string; role: string };
			this._participants.update((map) => {
				const current = map.get(id);
				if (!current) return map;
				const next = new Map(map);
				next.set(id, { ...current, isModerator: role === 'moderator' });
				return next;
			});
		});

		// Cubre el caso de displayName tardío o renombrado
		this.jitsiApi.addEventListener('displayNameChange', (data: unknown) => {
			const { id, displayname } = data as { id: string; displayname: string };
			if (!id || !displayname) return;
			this._participants.update((map) => {
				const current = map.get(id);
				if (!current) return map;
				const next = new Map(map);
				next.set(id, { ...current, displayName: displayname });
				return next;
			});
		});
	}

	/** Consulta roles reales de participantes ya presentes en la sala */
	private syncParticipantRoles(delay = 0): void {
		if (!this.jitsiApi) return;

		this.syncingParticipants.set(true);

		const doSync = (): void => {
			try {
				// getParticipantsInfo() del IframeAPI de Jitsi es sincrono — retorna Array, no Promise
				const participants = this.jitsiApi?.getParticipantsInfo() ?? [];
				this._participants.update((map) => {
					const next = new Map(map);
					for (const p of participants) {
						const current = next.get(p.participantId);
						if (current) {
							// Reconciliar displayName si llegó vacío en participantJoined — clave para el match docente por nombre
							next.set(p.participantId, {
								displayName: p.displayName || current.displayName,
								isModerator: p.role === 'moderator',
							});
						} else if (p.displayName) {
							next.set(p.participantId, {
								displayName: p.displayName,
								isModerator: p.role === 'moderator',
							});
						}
					}
					return next;
				});
			} catch {
				// Silencioso: el conteo seguirá basándose en los eventos
			} finally {
				this.syncingParticipants.set(false);
			}
		};

		if (delay > 0) {
			setTimeout(doSync, delay);
		} else {
			doSync();
		}
	}

	private disposeJitsi(): void {
		if (this.jitsiApi) {
			try {
				this.jitsiApi.dispose();
			} catch {
				// Jitsi can throw during dispose if already cleaned up
			}
			this.jitsiApi = null;
		}
	}
	// #endregion
}
