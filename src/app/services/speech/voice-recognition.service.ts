import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

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
	private registeredModals: Map<string, RegisteredModal> = new Map();

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

	private monthNames: Record<string, number> = {
		enero: 1,
		febrero: 2,
		marzo: 3,
		abril: 4,
		mayo: 5,
		junio: 6,
		julio: 7,
		agosto: 8,
		septiembre: 9,
		setiembre: 9,
		octubre: 10,
		noviembre: 11,
		diciembre: 12,
	};

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
			// Comandos de fecha - meses
			{
				patterns: [
					'ir a enero',
					'enero',
					'ir a febrero',
					'febrero',
					'ir a marzo',
					'marzo',
					'ir a abril',
					'abril',
					'ir a mayo',
					'mayo',
					'ir a junio',
					'junio',
					'ir a julio',
					'julio',
					'ir a agosto',
					'agosto',
					'ir a septiembre',
					'septiembre',
					'ir a setiembre',
					'setiembre',
					'ir a octubre',
					'octubre',
					'ir a noviembre',
					'noviembre',
					'ir a diciembre',
					'diciembre',
				],
				action: () => {}, // Se maneja en processTranscript
				description: 'Cambiar mes',
			},
			// Comandos de fecha - años
			{
				patterns: ['ir a (20\\d{2})', 'año (20\\d{2})', '(20\\d{2})'],
				action: (params) => this.emitCommand('change-year', params),
				description: 'Cambiar año',
			},
			// Comandos de scroll/navegación en página
			{
				patterns: ['baja', 'bajar', 'abajo', 'scroll abajo'],
				action: () => this.scrollPage('down'),
				description: 'Bajar en la página',
			},
			{
				patterns: ['sube', 'subir', 'arriba', 'scroll arriba'],
				action: () => this.scrollPage('up'),
				description: 'Subir en la página',
			},
			{
				patterns: ['izquierda', 'scroll izquierda'],
				action: () => this.scrollPage('left'),
				description: 'Scroll a la izquierda',
			},
			{
				patterns: ['derecha', 'scroll derecha'],
				action: () => this.scrollPage('right'),
				description: 'Scroll a la derecha',
			},
			{
				patterns: ['al inicio', 'ir al inicio', 'principio'],
				action: () => this.scrollPage('top'),
				description: 'Ir al inicio de la página',
			},
			{
				patterns: ['al final', 'ir al final', 'fin'],
				action: () => this.scrollPage('bottom'),
				description: 'Ir al final de la página',
			},
		];
	}

	private scrollPage(direction: 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom'): void {
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

		// Buscar mes en el texto
		for (const [monthName, monthNumber] of Object.entries(this.monthNames)) {
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
		// Detectar "abrir X" o "cerrar X"
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
			// Emitir comando genérico si no está registrado
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
			// Emitir comando genérico si no está registrado
			this.lastCommand.set(`Cerrar ${modalName}`);
			this.emitCommand('close-modal', modalName);
			setTimeout(() => this.lastCommand.set(null), 2000);
			return true;
		}

		return false;
	}

	private findModal(name: string): RegisteredModal | undefined {
		const normalizedName = name.toLowerCase().trim();

		// Buscar por nombre exacto
		if (this.registeredModals.has(normalizedName)) {
			return this.registeredModals.get(normalizedName);
		}

		// Buscar por aliases
		for (const modal of this.registeredModals.values()) {
			if (modal.aliases.some((alias) => alias.toLowerCase() === normalizedName)) {
				return modal;
			}
			// Búsqueda parcial
			if (modal.name.toLowerCase().includes(normalizedName) || normalizedName.includes(modal.name.toLowerCase())) {
				return modal;
			}
			if (modal.aliases.some((alias) => alias.toLowerCase().includes(normalizedName) || normalizedName.includes(alias.toLowerCase()))) {
				return modal;
			}
		}

		return undefined;
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

	/**
	 * Registra un modal para poder abrirlo/cerrarlo por voz
	 * @param modal Configuración del modal con nombre, aliases y funciones
	 * @returns Función para desregistrar el modal
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
}
