// #region Imports
import { Injectable, signal } from '@angular/core';

// #endregion
// #region Implementation
/**
 * Speech synthesis wrapper for browser text to speech.
 */
@Injectable({
	providedIn: 'root',
})
export class SpeechService {
	// Wrapper for browser speech synthesis.
	private synthesis = window.speechSynthesis;
	readonly isSpeaking = signal(false);

	/**
	 * Speak a text string using SpeechSynthesis.
	 *
	 * @param text Text to speak.
	 * @param lang Language code, default is es-ES.
	 * @example
	 * speech.speak('Hola', 'es-ES');
	 */
	speak(text: string, lang = 'es-ES'): void {
		if (!this.synthesis) return;

		this.stop();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = lang;
		utterance.rate = 1;
		utterance.pitch = 1;

		utterance.onstart = () => this.isSpeaking.set(true);
		utterance.onend = () => this.isSpeaking.set(false);
		utterance.onerror = () => this.isSpeaking.set(false);

		this.synthesis.speak(utterance);
	}

	/**
	 * Stop current speech.
	 */
	stop(): void {
		this.synthesis?.cancel();
		this.isSpeaking.set(false);
	}

	/**
	 * Pause current speech.
	 */
	pause(): void {
		this.synthesis?.pause();
	}

	/**
	 * Resume paused speech.
	 */
	resume(): void {
		this.synthesis?.resume();
	}

	/**
	 * Get available voices.
	 */
	getVoices(): SpeechSynthesisVoice[] {
		return this.synthesis?.getVoices() || [];
	}

	/**
	 * True when speech synthesis is supported.
	 */
	get isSupported(): boolean {
		return 'speechSynthesis' in window;
	}
}
// #endregion
