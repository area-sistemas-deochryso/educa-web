import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface VoiceCommand {
	patterns: string[];
	action: (params?: string) => void;
	description: string;
}

interface IWindow extends Window {
	SpeechRecognition: any;
	webkitSpeechRecognition: any;
}

@Injectable({
	providedIn: 'root',
})
export class VoiceRecognitionService {
	private router = inject(Router);
	private recognition: any = null;

	readonly isListening = signal(false);
	readonly isLocked = signal(false);
	readonly transcript = signal('');
	readonly interimTranscript = signal('');
	readonly lastCommand = signal<string | null>(null);
	readonly error = signal<string | null>(null);

	private activeInput: HTMLInputElement | HTMLTextAreaElement | null = null;
	private commands: VoiceCommand[] = [];

	constructor() {
		this.initRecognition();
		this.registerDefaultCommands();
	}

	private initRecognition(): void {
		const windowRef = window as unknown as IWindow;
		const SpeechRecognitionAPI = windowRef.SpeechRecognition || windowRef.webkitSpeechRecognition;

		if (!SpeechRecognitionAPI) {
			console.warn('[VoiceRecognition] API no soportada en este navegador');
			return;
		}

		this.recognition = new SpeechRecognitionAPI();
		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = 'es-PE';

		this.recognition.onresult = (event: any) => {
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
					// No fue un comando, agregar al transcript
					const current = this.transcript();
					this.transcript.set(current ? `${current} ${final}` : final);
					this.updateActiveInput();
				}
			}
		};

		this.recognition.onerror = (event: any) => {
			console.error('[VoiceRecognition] Error:', event.error);

			// Manejar errores específicos
			switch (event.error) {
				case 'network':
					this.error.set('Error de red. Verifica tu conexión a internet y que uses HTTPS.');
					this.stop();
					break;
				case 'not-allowed':
				case 'service-not-allowed':
					this.error.set('Permiso de micrófono denegado. Habilítalo en la configuración del navegador.');
					this.stop();
					break;
				case 'no-speech':
					// No hacer nada, es normal
					break;
				case 'aborted':
					// Ignorar, fue cancelado intencionalmente
					break;
				default:
					this.error.set(`Error: ${event.error}`);
					this.stop();
			}
		};

		this.recognition.onend = () => {
			if (this.isLocked() && this.isListening()) {
				// Reiniciar si está bloqueado
				this.recognition?.start();
			} else {
				this.isListening.set(false);
			}
		};
	}

	private registerDefaultCommands(): void {
		// Comandos de navegación
		this.commands = [
			{
				patterns: ['ir a inicio', 've a inicio', 'inicio'],
				action: () => this.router.navigate(['/intranet']),
				description: 'Navegar a inicio',
			},
			{
				patterns: ['ir a asistencia', 've a asistencia', 'asistencia'],
				action: () => this.router.navigate(['/intranet/asistencia']),
				description: 'Navegar a asistencia',
			},
			{
				patterns: ['ir a horario', 'ir a horarios', 've a horarios', 'horarios', 'horario'],
				action: () => this.router.navigate(['/intranet/horarios']),
				description: 'Navegar a horarios',
			},
			{
				patterns: ['ir a calendario', 've a calendario', 'calendario'],
				action: () => this.router.navigate(['/intranet/Calendario']),
				description: 'Navegar a calendario',
			},
			// Comandos de paginación
			{
				patterns: ['siguiente página', 'página siguiente', 'siguiente'],
				action: () => this.emitCommand('next-page'),
				description: 'Ir a la siguiente página',
			},
			{
				patterns: ['página anterior', 'anterior'],
				action: () => this.emitCommand('prev-page'),
				description: 'Ir a la página anterior',
			},
			{
				patterns: ['página (\\d+)', 'ir a página (\\d+)'],
				action: (params) => this.emitCommand('goto-page', params),
				description: 'Ir a una página específica',
			},
			// Comandos de control
			{
				patterns: ['cerrar', 'cerrar modal', 'cerrar ventana'],
				action: () => this.emitCommand('close-modal'),
				description: 'Cerrar modal activo',
			},
			{
				patterns: ['borrar', 'limpiar', 'borrar texto'],
				action: () => {
					this.transcript.set('');
					this.updateActiveInput();
				},
				description: 'Borrar el texto dictado',
			},
		];
	}

	private processTranscript(text: string): boolean {
		const normalizedText = text.toLowerCase().trim();

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

	private commandListeners: ((command: string, params?: string) => void)[] = [];

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

	start(): void {
		if (!this.recognition || this.isListening()) return;

		try {
			this.error.set(null); // Limpiar error anterior
			this.recognition.start();
			this.isListening.set(true);
		} catch (e) {
			console.error('[VoiceRecognition] Error al iniciar:', e);
			this.error.set('No se pudo iniciar el reconocimiento de voz.');
		}
	}

	stop(): void {
		if (!this.recognition) return;

		this.isLocked.set(false);
		this.isListening.set(false);
		this.recognition.stop();
	}

	lock(): void {
		this.isLocked.set(true);
	}

	unlock(): void {
		this.isLocked.set(false);
		this.stop();
	}

	clear(): void {
		this.transcript.set('');
		this.interimTranscript.set('');
		this.updateActiveInput();
	}

	setActiveInput(input: HTMLInputElement | HTMLTextAreaElement | null): void {
		this.activeInput = input;
	}

	private updateActiveInput(): void {
		if (this.activeInput) {
			this.activeInput.value = this.transcript();
			this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}

	get isSupported(): boolean {
		return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
	}
}
