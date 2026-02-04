import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
	VOICE_COMMANDS,
	MONTH_NAMES,
	VoiceCommandConfig,
	VoiceCommandContext,
	ScrollDirection,
} from './voice-commands.config';
import { logger } from '@core/helpers';
import {
	UI_VOICE_MESSAGES,
	UI_VOICE_MESSAGES_DYNAMIC,
} from '@app/shared/constants';

export interface VoiceCommand {
	patterns: string[];
	action: (params?: string) => void;
	description: string;
}

export interface RegisteredModal {
	name: string;
	aliases: string[];
	open: () => void;
	close: () => void;
}

interface SpeechRecognitionErrorEvent extends Event {
	error:
		| 'no-speech'
		| 'aborted'
		| 'audio-capture'
		| 'network'
		| 'not-allowed'
		| 'service-not-allowed'
		| 'bad-grammar'
		| 'language-not-supported';
	message?: string;
}

interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

interface SpeechRecognitionResult {
	[index: number]: SpeechRecognitionAlternative;
	isFinal: boolean;
	length: number;
}

interface SpeechRecognitionResultList {
	[index: number]: SpeechRecognitionResult;
	length: number;
}

interface SpeechRecognitionEvent extends Event {
	resultIndex: number;
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognitionInstance;
	prototype: SpeechRecognitionInstance;
}

interface IWindow extends Window {
	SpeechRecognition?: SpeechRecognitionConstructor;
	webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

@Injectable({
	providedIn: 'root',
})
export class VoiceRecognitionService {
	private platformId = inject(PLATFORM_ID);
	private router = inject(Router);
	private recognition: SpeechRecognitionInstance | null = null;

	readonly isListening = signal(false);
	readonly isLocked = signal(false);
	readonly transcript = signal('');
	readonly interimTranscript = signal('');
	readonly lastCommand = signal<string | null>(null);
	readonly error = signal<string | null>(null);

	private activeInput: HTMLInputElement | HTMLTextAreaElement | null = null;
	private commands: VoiceCommand[] = [];
	private registeredModals = new Map<string, RegisteredModal>();
	private commandListeners: ((command: string, params?: string) => void)[] = [];

	/** Audio para sonido de inicio de grabación (estilo WhatsApp) */
	private startSound: HTMLAudioElement | null = null;
	/** Audio para sonido de fin de grabación */
	private stopSound: HTMLAudioElement | null = null;

	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.initSounds();
			this.initRecognition();
			this.loadCommandsFromConfig();
		}
	}

	/**
	 * Inicializa los sonidos del micrófono (estilo WhatsApp)
	 * Usa sonidos de Mixkit - https://mixkit.co/free-sound-effects/
	 */
	private initSounds(): void {
		// Sonido de inicio: tono de confirmación suave
		this.startSound = new Audio();
		this.startSound.src = 'sounds/mic-start.mp3';
		this.startSound.volume = 0.4;

		// Sonido de fin: pop suave
		this.stopSound = new Audio();
		this.stopSound.src = 'sounds/mic-stop.mp3';
		this.stopSound.volume = 0.4;
	}

	/**
	 * Reproduce el sonido de inicio de grabación
	 */
	private playStartSound(): void {
		if (this.startSound) {
			this.startSound.currentTime = 0;
			this.startSound.play().catch((e) => {
				logger.warn('[VoiceRecognition] No se pudo reproducir sonido de inicio:', e);
			});
		}
	}

	/**
	 * Reproduce el sonido de fin de grabación
	 */
	private playStopSound(): void {
		if (this.stopSound) {
			this.stopSound.currentTime = 0;
			this.stopSound.play().catch((e) => {
				logger.warn('[VoiceRecognition] No se pudo reproducir sonido de fin:', e);
			});
		}
	}

	private initRecognition(): void {
		const windowRef = window as unknown as IWindow;
		const SpeechRecognitionAPI =
			windowRef.SpeechRecognition || windowRef.webkitSpeechRecognition;

		if (!SpeechRecognitionAPI) {
			logger.warn('[VoiceRecognition] API no soportada en este navegador');
			return;
		}

		this.recognition = new SpeechRecognitionAPI();
		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = 'es-PE';

		this.recognition.onresult = (event: SpeechRecognitionEvent) => {
			let interim = '';
			let final = '';

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript;
				if (event.results[i].isFinal) {
					final += transcript;
				} else {
					interim += transcript;
				}
			}

			this.interimTranscript.set(interim);

			if (final) {
				const processed = this.processTranscript(final);
				if (!processed) {
					const current = this.transcript();
					this.transcript.set(current ? `${current} ${final}` : final);
					this.updateActiveInput();
				}
			}
		};

		this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			logger.error('[VoiceRecognition] Error:', event.error);

			switch (event.error) {
				case 'network':
					this.error.set(UI_VOICE_MESSAGES.networkError);
					this.stop();
					break;
				case 'not-allowed':
				case 'service-not-allowed':
					this.error.set(UI_VOICE_MESSAGES.micPermissionDenied);
					this.stop();
					break;
				case 'no-speech':
				case 'aborted':
					break;
				default:
					this.error.set(UI_VOICE_MESSAGES_DYNAMIC.genericError(event.error));
					this.stop();
			}
		};

		this.recognition.onend = () => {
			if (this.isLocked() && this.isListening()) {
				this.recognition?.start();
			} else {
				this.isListening.set(false);
			}
		};
	}

	/**
	 * Carga los comandos desde la configuración centralizada
	 */
	private loadCommandsFromConfig(): void {
		this.commands = VOICE_COMMANDS.map((config) => this.configToCommand(config));
	}

	/**
	 * Convierte una configuración de comando a un VoiceCommand ejecutable
	 */
	private configToCommand(config: VoiceCommandConfig): VoiceCommand {
		return {
			patterns: config.patterns,
			description: config.description,
			action: (params?: string) => this.executeCommand(config, params),
		};
	}

	/**
	 * Ejecuta un comando según su tipo de acción
	 */
	private executeCommand(config: VoiceCommandConfig, params?: string): void {
		const context: VoiceCommandContext = {
			router: this.router,
			emitCommand: (cmd, p) => this.emitCommand(cmd, p),
			clearTranscript: () => {
				this.transcript.set('');
				this.updateActiveInput();
			},
			params,
		};

		switch (config.actionType) {
			case 'navigate':
				if (config.route) {
					this.router.navigate([config.route]);
				}
				break;

			case 'emit':
				if (config.emitCommand) {
					this.emitCommand(config.emitCommand, params);
				}
				break;

			case 'scroll':
				if (config.scrollDirection) {
					this.scrollPage(config.scrollDirection);
				}
				break;

			case 'custom':
				if (config.customAction) {
					config.customAction(context);
				}
				break;
		}
	}

	private scrollPage(direction: ScrollDirection): void {
		const scrollAmount = 300;
		const scrollOptions: ScrollToOptions = { behavior: 'smooth' };

		switch (direction) {
			case 'up':
				window.scrollBy({ top: -scrollAmount, ...scrollOptions });
				break;
			case 'down':
				window.scrollBy({ top: scrollAmount, ...scrollOptions });
				break;
			case 'left':
				window.scrollBy({ left: -scrollAmount, ...scrollOptions });
				break;
			case 'right':
				window.scrollBy({ left: scrollAmount, ...scrollOptions });
				break;
			case 'top':
				window.scrollTo({ top: 0, ...scrollOptions });
				break;
			case 'bottom':
				window.scrollTo({ top: document.body.scrollHeight, ...scrollOptions });
				break;
		}
	}

	private processMonthCommand(text: string): boolean {
		const normalizedText = text.toLowerCase().trim();

		for (const [monthName, monthNumber] of Object.entries(MONTH_NAMES)) {
			if (normalizedText.includes(monthName)) {
				this.lastCommand.set(`Cambiar a ${monthName}`);
				this.emitCommand('change-month', monthNumber.toString());
				setTimeout(() => this.lastCommand.set(null), 2000);
				return true;
			}
		}

		return false;
	}

	private processTranscript(text: string): boolean {
		const normalizedText = text.toLowerCase().trim();

		// Primero intentar comandos de mes (tienen prioridad)
		if (this.processMonthCommand(normalizedText)) {
			return true;
		}

		// Luego comandos de año
		const yearMatch = normalizedText.match(/(20\d{2})/);
		if (yearMatch) {
			this.lastCommand.set(`Cambiar a año ${yearMatch[1]}`);
			this.emitCommand('change-year', yearMatch[1]);
			setTimeout(() => this.lastCommand.set(null), 2000);
			return true;
		}

		// Comandos de modal (abrir/cerrar + nombre)
		if (this.processModalCommand(normalizedText)) {
			return true;
		}

		// Buscar en comandos registrados
		for (const command of this.commands) {
			for (const pattern of command.patterns) {
				const regex = new RegExp(`^${pattern}$`, 'i');
				const match = normalizedText.match(regex);

				if (match) {
					this.lastCommand.set(command.description);
					command.action(match[1]);
					setTimeout(() => this.lastCommand.set(null), 2000);
					return true;
				}
			}
		}

		return false;
	}

	private processModalCommand(text: string): boolean {
		const openMatch = text.match(/^abrir\s+(.+)$/i);
		const closeMatch = text.match(/^cerrar\s+(.+)$/i);

		if (openMatch) {
			const modalName = openMatch[1].trim();
			const modal = this.findModal(modalName);
			if (modal) {
				this.lastCommand.set(`Abrir ${modal.name}`);
				modal.open();
				setTimeout(() => this.lastCommand.set(null), 2000);
				return true;
			}
			this.lastCommand.set(`Abrir ${modalName}`);
			this.emitCommand('open-modal', modalName);
			setTimeout(() => this.lastCommand.set(null), 2000);
			return true;
		}

		if (closeMatch) {
			const modalName = closeMatch[1].trim();
			const modal = this.findModal(modalName);
			if (modal) {
				this.lastCommand.set(`Cerrar ${modal.name}`);
				modal.close();
				setTimeout(() => this.lastCommand.set(null), 2000);
				return true;
			}
			this.lastCommand.set(`Cerrar ${modalName}`);
			this.emitCommand('close-modal', modalName);
			setTimeout(() => this.lastCommand.set(null), 2000);
			return true;
		}

		return false;
	}

	private findModal(name: string): RegisteredModal | undefined {
		const normalizedName = name.toLowerCase().trim();

		if (this.registeredModals.has(normalizedName)) {
			return this.registeredModals.get(normalizedName);
		}

		for (const modal of this.registeredModals.values()) {
			if (modal.aliases.some((alias) => alias.toLowerCase() === normalizedName)) {
				return modal;
			}
			if (
				modal.name.toLowerCase().includes(normalizedName) ||
				normalizedName.includes(modal.name.toLowerCase())
			) {
				return modal;
			}
			if (
				modal.aliases.some(
					(alias) =>
						alias.toLowerCase().includes(normalizedName) ||
						normalizedName.includes(alias.toLowerCase()),
				)
			) {
				return modal;
			}
		}

		return undefined;
	}

	// =========================================================================
	// API PÚBLICA
	// =========================================================================

	/**
	 * Suscribirse a eventos de comandos
	 */
	onCommand(callback: (command: string, params?: string) => void): () => void {
		this.commandListeners.push(callback);
		return () => {
			const index = this.commandListeners.indexOf(callback);
			if (index > -1) this.commandListeners.splice(index, 1);
		};
	}

	private emitCommand(command: string, params?: string): void {
		this.commandListeners.forEach((cb) => cb(command, params));
	}

	/**
	 * Inicia el reconocimiento de voz
	 */
	start(): void {
		if (!this.recognition || this.isListening()) return;

		try {
			this.error.set(null);
			this.recognition.start();
			this.isListening.set(true);
			this.playStartSound();
		} catch (e) {
			logger.error('[VoiceRecognition] Error al iniciar:', e);
			this.error.set(UI_VOICE_MESSAGES.startFailed);
		}
	}

	/**
	 * Detiene el reconocimiento de voz
	 */
	stop(): void {
		if (!this.recognition) return;

		const wasListening = this.isListening();
		this.isLocked.set(false);
		this.isListening.set(false);
		this.recognition.stop();

		// Solo reproducir sonido si estaba escuchando activamente
		if (wasListening) {
			this.playStopSound();
		}
	}

	/**
	 * Bloquea el micrófono para grabación continua
	 */
	lock(): void {
		this.isLocked.set(true);
	}

	/**
	 * Desbloquea el micrófono y detiene la grabación
	 */
	unlock(): void {
		this.isLocked.set(false);
		this.stop();
	}

	/**
	 * Limpia el transcript actual
	 */
	clear(): void {
		this.transcript.set('');
		this.interimTranscript.set('');
		this.updateActiveInput();
	}

	/**
	 * Establece el input activo para dictado
	 */
	setActiveInput(input: HTMLInputElement | HTMLTextAreaElement | null): void {
		this.activeInput = input;
	}

	private updateActiveInput(): void {
		if (this.activeInput) {
			this.activeInput.value = this.transcript();
			this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}

	/**
	 * Indica si el navegador soporta reconocimiento de voz
	 */
	get isSupported(): boolean {
		return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
	}

	/**
	 * Registra un modal para control por voz
	 */
	registerModal(modal: RegisteredModal): () => void {
		const key = modal.name.toLowerCase();
		this.registeredModals.set(key, modal);
		return () => {
			this.registeredModals.delete(key);
		};
	}

	/**
	 * Desregistra un modal por nombre
	 */
	unregisterModal(name: string): void {
		this.registeredModals.delete(name.toLowerCase());
	}

	/**
	 * Obtiene la lista de modales registrados
	 */
	getRegisteredModals(): string[] {
		return Array.from(this.registeredModals.keys());
	}

	/**
	 * Añade un comando dinámicamente en tiempo de ejecución
	 */
	addCommand(command: VoiceCommand): () => void {
		this.commands.push(command);
		return () => {
			const index = this.commands.indexOf(command);
			if (index > -1) this.commands.splice(index, 1);
		};
	}

	/**
	 * Obtiene todos los comandos registrados (para debug/documentación)
	 */
	getRegisteredCommands(): { pattern: string; description: string }[] {
		return this.commands.flatMap((cmd) =>
			cmd.patterns.map((p) => ({ pattern: p, description: cmd.description })),
		);
	}
}
