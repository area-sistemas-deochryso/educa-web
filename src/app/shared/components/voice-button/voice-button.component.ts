// #region Imports
import {
	AfterViewInit,
	Component,
	ElementRef,
	HostListener,
	ViewChild,
	computed,
	inject,
	signal,
	OnInit,
	OnDestroy,
} from '@angular/core';
import { VOICE_COMMANDS, VoiceCommandCategory } from '@core/services/speech/voice-commands.config';
import { CommonModule } from '@angular/common';
import { VoiceRecognitionService, KeyboardShortcutsService } from '@core/services';
import { logger } from '@core/helpers';

// #endregion
// #region Implementation
@Component({
	selector: 'app-voice-button',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './voice-button.component.html',
	styleUrl: './voice-button.component.scss',
})
export class VoiceButtonComponent implements OnInit, AfterViewInit, OnDestroy {
	// * Floating button reference for drag interactions.
	@ViewChild('voiceButton') voiceButton!: ElementRef<HTMLButtonElement>;

	// * Voice recognition state + keyboard shortcut toggle.
	voiceService = inject(VoiceRecognitionService);
	private keyboardService = inject(KeyboardShortcutsService);

	// * Drag/lock state while holding the mic button.
	isDragging = false;
	dragStartY = 0;
	currentDragY = 0;
	lockThreshold = 80;
	showLockIndicator = false;
	isVisible = signal(true);

	// * Context menu for browsing available voice commands.
	showContextMenu = false;
	contextMenuPosition = { x: 0, y: 0 };
	voiceCommands = VOICE_COMMANDS;
	categories: VoiceCommandCategory[] = [
		'navigation',
		'scroll',
		'pagination',
		'modal',
		'date',
		'control',
	];
	categoryLabels: Record<VoiceCommandCategory, string> = {
		navigation: 'NavegaciÃƒÂ³n',
		scroll: 'Scroll',
		pagination: 'PaginaciÃƒÂ³n',
		modal: 'Modales',
		date: 'Fechas',
		control: 'Control',
	};

	isOnline = signal(false);
	isSecureContext = computed(() => this.checkSecureContext());

	private checkSecureContext(): boolean {
		return (
			window.isSecureContext ||
			location.protocol === 'https:' ||
			location.hostname === 'localhost' ||
			location.hostname === '127.0.0.1'
		);
	}

	ngOnInit(): void {
		// * Keyboard shortcut to show/hide the button.
		this.keyboardService.register('toggle-voice-button', () => {
			this.isVisible.update((v) => !v);
		});
	}

	ngAfterViewInit(): void {
		if (!this.voiceService.isSupported) {
			logger.warn('Voice recognition not supported');
		}
	}

	ngOnDestroy(): void {
		this.keyboardService.unregister('toggle-voice-button');
	}

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

	onMouseDown(event: MouseEvent): void {
		if (event.button === 2) return;
		this.startRecording(event.clientY);
	}

	@HostListener('document:mousemove', ['$event'])
	onMouseMove(event: MouseEvent): void {
		if (!this.isDragging) return;
		this.handleDrag(event.clientY);
	}

	@HostListener('document:mouseup')
	onMouseUp(): void {
		if (this.isDragging) this.endRecording();
	}

	private startRecording(startY: number): void {
		// * Start listening and allow upward drag to lock.
		if (this.voiceService.isLocked()) return;
		this.isDragging = true;
		this.dragStartY = startY;
		this.currentDragY = 0;
		this.voiceService.start();
	}

	private handleDrag(currentY: number): void {
		// * Track drag distance and lock when past threshold.
		this.currentDragY = this.dragStartY - currentY;
		this.showLockIndicator = this.currentDragY > this.lockThreshold * 0.5;

		if (this.currentDragY > this.lockThreshold && !this.voiceService.isLocked()) {
			this.voiceService.lock();
			this.isDragging = false;
			if (navigator.vibrate) navigator.vibrate(50);
		}
	}

	private endRecording(): void {
		// * Stop recording unless already locked.
		this.isDragging = false;
		this.showLockIndicator = false;
		this.currentDragY = 0;
		if (!this.voiceService.isLocked()) this.voiceService.stop();
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

	// * Context menu methods.
	onContextMenu(event: MouseEvent): void {
		event.preventDefault();
		this.contextMenuPosition = { x: event.clientX, y: event.clientY };
		this.showContextMenu = true;
	}

	@HostListener('document:click')
	onDocumentClick(): void {
		this.showContextMenu = false;
	}

	closeContextMenu(): void {
		this.showContextMenu = false;
	}

	getCommandsByCategory(category: VoiceCommandCategory) {
		return this.voiceCommands.filter((cmd) => cmd.category === category);
	}

	getCommandPatterns(patterns: string[]): string {
		// Mostrar solo el primer patrÃƒÂ³n de forma legible
		return patterns[0].replace(/\(.*?\)/g, '...').replace(/\\/g, '');
	}
}
// #endregion
