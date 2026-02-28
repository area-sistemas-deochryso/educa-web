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
import {
	SpeechRecognitionInstance,
	SpeechRecognitionEvent,
	SpeechRecognitionErrorEvent,
	IWindow,
} from './speech-recognition.types';
import { logger } from '@core/helpers';
import {
	UI_VOICE_MESSAGES,
	UI_VOICE_MESSAGES_DYNAMIC,
} from '@app/shared/constants';

/**
 * Runtime voice command definition.
 */
export interface VoiceCommand {
	/** Patterns used to match the command. */
	patterns: string[];
	/** Action executed when the command matches. */
	action: (params?: string) => void;
	/** Display description for the command. */
	description: string;
}

/**
 * Modal registration for voice open and close commands.
 */
export interface RegisteredModal {
	/** Modal name. */
	name: string;
	/** Alternate names for matching. */
	aliases: string[];
	/** Open handler. */
	open: () => void;
	/** Close handler. */
	close: () => void;
}

@Injectable({
	providedIn: 'root',
})
export class VoiceRecognitionService {
	// #region Dependencies
	private platformId = inject(PLATFORM_ID);
	private router = inject(Router);
	private recognition: SpeechRecognitionInstance | null = null;
	// #endregion

	// #region Private state
	private readonly _isListening = signal(false);
	private readonly _isLocked = signal(false);
	private readonly _transcript = signal('');
	private readonly _interimTranscript = signal('');
	private readonly _lastCommand = signal<string | null>(null);
	private readonly _error = signal<string | null>(null);

	private activeInput: HTMLInputElement | HTMLTextAreaElement | null = null;
	private commands: VoiceCommand[] = [];
	private registeredModals = new Map<string, RegisteredModal>();
	private commandListeners: ((command: string, params?: string) => void)[] = [];

	private startSound: HTMLAudioElement | null = null;
	private stopSound: HTMLAudioElement | null = null;
	// #endregion

	// #region Public readonly state
	readonly isListening = this._isListening.asReadonly();
	readonly isLocked = this._isLocked.asReadonly();
	readonly transcript = this._transcript.asReadonly();
	readonly interimTranscript = this._interimTranscript.asReadonly();
	readonly lastCommand = this._lastCommand.asReadonly();
	readonly error = this._error.asReadonly();
	// #endregion

	// #region Initialization
	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.initSounds();
			this.initRecognition();
			this.loadCommandsFromConfig();
		}
	}

	/**
	 * Initialize audio assets for start and stop sounds.
	 */
	private initSounds(): void {
		this.startSound = new Audio();
		this.startSound.src = 'sounds/mic-start.mp3';
		this.startSound.volume = 0.4;

		this.stopSound = new Audio();
		this.stopSound.src = 'sounds/mic-stop.mp3';
		this.stopSound.volume = 0.4;
	}

	/**
	 * Play the start listening sound.
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
	 * Play the stop listening sound.
	 */
	private playStopSound(): void {
		if (this.stopSound) {
			this.stopSound.currentTime = 0;
			this.stopSound.play().catch((e) => {
				logger.warn('[VoiceRecognition] No se pudo reproducir sonido de fin:', e);
			});
		}
	}
	// #endregion

	// #region SpeechRecognition API
	/**
	 * Initialize the browser SpeechRecognition API.
	 */
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

			this._interimTranscript.set(interim);

			if (final) {
				const processed = this.processTranscript(final);
				if (!processed) {
					const current = this._transcript();
					this._transcript.set(current ? `${current} ${final}` : final);
					this.updateActiveInput();
				}
			}
		};

		this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			logger.error('[VoiceRecognition] Error:', event.error);

			switch (event.error) {
				case 'network':
					this._error.set(UI_VOICE_MESSAGES.networkError);
					this.stop();
					break;
				case 'not-allowed':
				case 'service-not-allowed':
					this._error.set(UI_VOICE_MESSAGES.micPermissionDenied);
					this.stop();
					break;
				case 'no-speech':
				case 'aborted':
					break;
				default:
					this._error.set(UI_VOICE_MESSAGES_DYNAMIC.genericError(event.error));
					this.stop();
			}
		};

		this.recognition.onend = () => {
			if (this._isLocked() && this._isListening()) {
				this.recognition?.start();
			} else {
				this._isListening.set(false);
			}
		};
	}
	// #endregion

	// #region Command parsing
	/**
	 * Load commands from the static configuration.
	 */
	private loadCommandsFromConfig(): void {
		this.commands = VOICE_COMMANDS.map((config) => this.configToCommand(config));
	}

	/**
	 * Normalize text for accent-insensitive matching.
	 */
	private normalizeText(text: string): string {
		return text
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.trim();
	}

	/**
	 * Convert a config object into a runtime command.
	 */
	private configToCommand(config: VoiceCommandConfig): VoiceCommand {
		return {
			patterns: config.patterns,
			description: config.description,
			action: (params?: string) => this.executeCommand(config, params),
		};
	}

	/**
	 * Process a transcript and dispatch commands if matched.
	 *
	 * @param text Raw recognized text.
	 * @returns True when a command was processed.
	 */
	private processTranscript(text: string): boolean {
		const normalizedText = this.normalizeText(text);

		// Month commands have priority.
		if (this.processMonthCommand(normalizedText)) {
			return true;
		}

		// Year command.
		const yearMatch = normalizedText.match(/(20\d{2})/);
		if (yearMatch) {
			this.showLastCommand(`Cambiar a anio ${yearMatch[1]}`);
			this.emitCommand('change-year', yearMatch[1]);
			return true;
		}

		// Modal commands.
		if (this.processModalCommand(normalizedText)) {
			return true;
		}

		// Registered commands.
		for (const command of this.commands) {
			for (const pattern of command.patterns) {
				const regex = new RegExp(`^${pattern}$`, 'i');
				const match = normalizedText.match(regex);

				if (match) {
					this.showLastCommand(command.description);
					command.action(match[1]);
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Process month commands using month name matching.
	 */
	private processMonthCommand(text: string): boolean {
		const normalizedText = this.normalizeText(text);

		for (const [monthName, monthNumber] of Object.entries(MONTH_NAMES)) {
			if (normalizedText.includes(monthName)) {
				this.showLastCommand(`Cambiar a ${monthName}`);
				this.emitCommand('change-month', monthNumber.toString());
				return true;
			}
		}

		return false;
	}

	/**
	 * Process modal open and close commands.
	 */
	private processModalCommand(text: string): boolean {
		const openMatch = text.match(/^abrir\s+(.+)$/i);
		const closeMatch = text.match(/^cerrar\s+(.+)$/i);

		if (openMatch) {
			const modalName = openMatch[1].trim();
			const modal = this.findModal(modalName);
			if (modal) {
				this.showLastCommand(`Abrir ${modal.name}`);
				modal.open();
				return true;
			}
			this.showLastCommand(`Abrir ${modalName}`);
			this.emitCommand('open-modal', modalName);
			return true;
		}

		if (closeMatch) {
			const modalName = closeMatch[1].trim();
			const modal = this.findModal(modalName);
			if (modal) {
				this.showLastCommand(`Cerrar ${modal.name}`);
				modal.close();
				return true;
			}
			this.showLastCommand(`Cerrar ${modalName}`);
			this.emitCommand('close-modal', modalName);
			return true;
		}

		return false;
	}

	/**
	 * Find a registered modal by name or alias.
	 */
	private findModal(name: string): RegisteredModal | undefined {
		const normalizedName = this.normalizeText(name);

		if (this.registeredModals.has(normalizedName)) {
			return this.registeredModals.get(normalizedName);
		}

		for (const modal of this.registeredModals.values()) {
			if (modal.aliases.some((alias) => this.normalizeText(alias) === normalizedName)) {
				return modal;
			}
			if (
				this.normalizeText(modal.name).includes(normalizedName) ||
				normalizedName.includes(this.normalizeText(modal.name))
			) {
				return modal;
			}
			if (
				modal.aliases.some(
					(alias) =>
						this.normalizeText(alias).includes(normalizedName) ||
						normalizedName.includes(this.normalizeText(alias)),
				)
			) {
				return modal;
			}
		}

		return undefined;
	}
	// #endregion

	// #region Command execution
	/**
	 * Execute a configured command using the provided config.
	 */
	private executeCommand(config: VoiceCommandConfig, params?: string): void {
		const context: VoiceCommandContext = {
			router: this.router,
			emitCommand: (cmd, p) => this.emitCommand(cmd, p),
			clearTranscript: () => {
				this._transcript.set('');
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

	/**
	 * Scroll the page based on a direction command.
	 */
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
	// #endregion

	// #region Command pub sub
	/**
	 * Subscribe to command events.
	 *
	 * @param callback Callback for command and params.
	 * @returns Unsubscribe function.
	 */
	onCommand(callback: (command: string, params?: string) => void): () => void {
		this.commandListeners.push(callback);
		return () => {
			const index = this.commandListeners.indexOf(callback);
			if (index > -1) this.commandListeners.splice(index, 1);
		};
	}

	/**
	 * Emit a command to registered listeners.
	 */
	private emitCommand(command: string, params?: string): void {
		this.commandListeners.forEach((cb) => cb(command, params));
	}
	// #endregion

	// #region Public commands
	/**
	 * Start listening for speech.
	 */
	start(): void {
		if (!this.recognition || this._isListening()) return;

		try {
			this._error.set(null);
			this.recognition.start();
			this._isListening.set(true);
			this.playStartSound();
		} catch (e) {
			logger.error('[VoiceRecognition] Error al iniciar:', e);
			this._error.set(UI_VOICE_MESSAGES.startFailed);
		}
	}

	/**
	 * Stop listening for speech and unlock the session.
	 */
	stop(): void {
		if (!this.recognition) return;

		const wasListening = this._isListening();
		this._isLocked.set(false);
		this._isListening.set(false);
		this.recognition.stop();

		if (wasListening) {
			this.playStopSound();
		}
	}

	/**
	 * Keep listening active after onend.
	 */
	lock(): void {
		this._isLocked.set(true);
	}

	/**
	 * Unlock and stop listening.
	 */
	unlock(): void {
		this._isLocked.set(false);
		this.stop();
	}

	/**
	 * Clear transcript and interim transcript.
	 */
	clear(): void {
		this._transcript.set('');
		this._interimTranscript.set('');
		this.updateActiveInput();
	}

	/**
	 * Clear the current error message.
	 */
	dismissError(): void {
		this._error.set(null);
	}

	/**
	 * True when SpeechRecognition API is supported.
	 */
	get isSupported(): boolean {
		return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
	}
	// #endregion

	// #region Active input
	/**
	 * Set the active input to update with transcripts.
	 */
	setActiveInput(input: HTMLInputElement | HTMLTextAreaElement | null): void {
		this.activeInput = input;
	}

	/**
	 * Update the active input value with the current transcript.
	 */
	private updateActiveInput(): void {
		if (this.activeInput) {
			this.activeInput.value = this._transcript();
			this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}
	// #endregion

	// #region Modal registration
	/**
	 * Register a modal for voice open and close commands.
	 *
	 * @param modal Modal config.
	 * @returns Unregister function.
	 */
	registerModal(modal: RegisteredModal): () => void {
		const key = modal.name.toLowerCase();
		this.registeredModals.set(key, modal);
		return () => {
			this.registeredModals.delete(key);
		};
	}

	/**
	 * Unregister a modal by name.
	 */
	unregisterModal(name: string): void {
		this.registeredModals.delete(name.toLowerCase());
	}

	/**
	 * Get registered modal keys.
	 */
	getRegisteredModals(): string[] {
		return Array.from(this.registeredModals.keys());
	}
	// #endregion

	// #region Dynamic commands
	/**
	 * Add a dynamic voice command.
	 *
	 * @param command Command definition.
	 * @returns Unregister function.
	 */
	addCommand(command: VoiceCommand): () => void {
		this.commands.push(command);
		return () => {
			const index = this.commands.indexOf(command);
			if (index > -1) this.commands.splice(index, 1);
		};
	}

	/**
	 * Get registered command patterns and descriptions.
	 */
	getRegisteredCommands(): { pattern: string; description: string }[] {
		return this.commands.flatMap((cmd) =>
			cmd.patterns.map((p) => ({ pattern: p, description: cmd.description })),
		);
	}
	// #endregion

	// #region Private helpers

	/**
	 * Show the last recognized command for 2 seconds.
	 */
	private showLastCommand(description: string): void {
		this._lastCommand.set(description);
		setTimeout(() => this._lastCommand.set(null), 2000);
	}
	// #endregion
}
