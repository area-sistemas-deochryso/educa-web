import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
	SpeechRecognitionInstance,
	SpeechRecognitionEvent,
	SpeechRecognitionErrorEvent,
	IWindow,
} from './speech-recognition.types';
import {
	VoiceCommandMatcherService,
	VoiceCommand,
	RegisteredModal,
} from './voice-command-matcher.service';
import { logger } from '@core/helpers';
import {
	UI_VOICE_MESSAGES,
	UI_VOICE_MESSAGES_DYNAMIC,
} from '@app/shared/constants';

// Re-export types for backward compatibility
export type { VoiceCommand, RegisteredModal } from './voice-command-matcher.service';

@Injectable({
	providedIn: 'root',
})
export class VoiceRecognitionService {
	// #region Dependencies
	private platformId = inject(PLATFORM_ID);
	private matcher = inject(VoiceCommandMatcherService);
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
			this.matcher.loadCommandsFromConfig({
				emitCommand: (cmd, p) => this.emitCommand(cmd, p),
				clearTranscript: () => {
					this._transcript.set('');
					this.updateActiveInput();
				},
			});
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
				const result = this.matcher.processTranscript(final, {
					emitCommand: (cmd, p) => this.emitCommand(cmd, p),
					clearTranscript: () => {
						this._transcript.set('');
						this.updateActiveInput();
					},
				});

				if (result.matched) {
					if (result.description) {
						this.showLastCommand(result.description);
					}
				} else {
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

	// #region Modal registration (delegates to matcher)
	/**
	 * Register a modal for voice open and close commands.
	 *
	 * @param modal Modal config.
	 * @returns Unregister function.
	 */
	registerModal(modal: RegisteredModal): () => void {
		return this.matcher.registerModal(modal);
	}

	/**
	 * Unregister a modal by name.
	 */
	unregisterModal(name: string): void {
		this.matcher.unregisterModal(name);
	}

	/**
	 * Get registered modal keys.
	 */
	getRegisteredModals(): string[] {
		return this.matcher.getRegisteredModals();
	}
	// #endregion

	// #region Dynamic commands (delegates to matcher)
	/**
	 * Add a dynamic voice command.
	 *
	 * @param command Command definition.
	 * @returns Unregister function.
	 */
	addCommand(command: VoiceCommand): () => void {
		return this.matcher.addCommand(command);
	}

	/**
	 * Get registered command patterns and descriptions.
	 */
	getRegisteredCommands(): { pattern: string; description: string }[] {
		return this.matcher.getRegisteredCommands();
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
