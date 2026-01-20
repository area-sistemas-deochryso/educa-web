import {
	Component,
	inject,
	ElementRef,
	ViewChild,
	HostListener,
	AfterViewInit,
	OnDestroy,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceRecognitionService } from '@app/services';
import { logger } from '@app/helpers';

@Component({
	selector: 'app-voice-button',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './voice-button.component.html',
	styleUrl: './voice-button.component.scss',
})
export class VoiceButtonComponent implements AfterViewInit, OnDestroy {
	@ViewChild('voiceButton') voiceButton!: ElementRef<HTMLButtonElement>;

	voiceService = inject(VoiceRecognitionService);

	isDragging = false;
	dragStartY = 0;
	currentDragY = 0;
	lockThreshold = 80; // píxeles para activar el lock
	showLockIndicator = false;
	isVisible = true;

	isOnline = signal(false);
	isSecureContext = signal(this.checkSecureContext());

	private touchStartTime = 0;
	private connectivityCheckInterval: ReturnType<typeof setInterval> | null = null;

	private checkSecureContext(): boolean {
		return (
			window.isSecureContext ||
			location.protocol === 'https:' ||
			location.hostname === 'localhost' ||
			location.hostname === '127.0.0.1'
		);
	}

	private async checkRealConnectivity(): Promise<boolean> {
		if (!navigator.onLine) {
			return false;
		}

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);

			const response = await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-store',
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			return true;
		} catch {
			return false;
		}
	}

	private async updateConnectivityStatus(): Promise<void> {
		const online = await this.checkRealConnectivity();
		this.isOnline.set(online);
	}

	ngAfterViewInit(): void {
		if (!this.voiceService.isSupported) {
			logger.warn('Voice recognition not supported');
		}

		// Verificar conectividad inicial
		this.updateConnectivityStatus();

		// Verificar periódicamente cada 5 segundos
		this.connectivityCheckInterval = setInterval(() => {
			this.updateConnectivityStatus();
		}, 5000);

		// También escuchar eventos del navegador para reaccionar más rápido
		window.addEventListener('online', () => this.updateConnectivityStatus());
		window.addEventListener('offline', () => this.isOnline.set(false));
	}

	@HostListener('document:keydown', ['$event'])
	onKeyDown(event: KeyboardEvent): void {
		if (event.ctrlKey && event.code === 'Space') {
			event.preventDefault();
			this.isVisible = !this.isVisible;
		}
	}

	ngOnDestroy(): void {
		this.voiceService.stop();
		if (this.connectivityCheckInterval) {
			clearInterval(this.connectivityCheckInterval);
		}
	}

	// Touch events para móvil
	onTouchStart(event: TouchEvent): void {
		this.startRecording(event.touches[0].clientY);
	}

	onTouchMove(event: TouchEvent): void {
		if (!this.isDragging) return;
		event.preventDefault();
		this.handleDrag(event.touches[0].clientY);
	}

	onTouchEnd(): void {
		this.endRecording();
	}

	// Mouse events para desktop
	onMouseDown(event: MouseEvent): void {
		this.startRecording(event.clientY);
	}

	@HostListener('document:mousemove', ['$event'])
	onMouseMove(event: MouseEvent): void {
		if (!this.isDragging) return;
		this.handleDrag(event.clientY);
	}

	@HostListener('document:mouseup')
	onMouseUp(): void {
		if (this.isDragging) {
			this.endRecording();
		}
	}

	private startRecording(startY: number): void {
		if (this.voiceService.isLocked()) {
			return; // Si está bloqueado, no iniciar nuevo drag
		}

		this.isDragging = true;
		this.dragStartY = startY;
		this.currentDragY = 0;
		this.touchStartTime = Date.now();
		this.voiceService.start();
	}

	private handleDrag(currentY: number): void {
		this.currentDragY = this.dragStartY - currentY;

		// Mostrar indicador de lock cuando se acerca al umbral
		this.showLockIndicator = this.currentDragY > this.lockThreshold * 0.5;

		// Activar lock si supera el umbral
		if (this.currentDragY > this.lockThreshold && !this.voiceService.isLocked()) {
			this.voiceService.lock();
			this.isDragging = false;
			// Vibrar si está disponible
			if (navigator.vibrate) {
				navigator.vibrate(50);
			}
		}
	}

	private endRecording(): void {
		this.isDragging = false;
		this.showLockIndicator = false;
		this.currentDragY = 0;

		// Si no está bloqueado, detener grabación
		if (!this.voiceService.isLocked()) {
			this.voiceService.stop();
		}
	}

	stopLocked(): void {
		this.voiceService.unlock();
	}

	clearTranscript(): void {
		this.voiceService.clear();
	}

	dismissError(): void {
		this.voiceService.error.set(null);
	}

	get dragOffset(): number {
		return Math.min(this.currentDragY, this.lockThreshold + 20);
	}
}
