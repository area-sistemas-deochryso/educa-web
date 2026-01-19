import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private synthesis = window.speechSynthesis;
  readonly isSpeaking = signal(false);

  speak(text: string, lang: string = 'es-ES'): void {
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

  stop(): void {
    this.synthesis?.cancel();
    this.isSpeaking.set(false);
  }

  pause(): void {
    this.synthesis?.pause();
  }

  resume(): void {
    this.synthesis?.resume();
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() || [];
  }

  get isSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}
