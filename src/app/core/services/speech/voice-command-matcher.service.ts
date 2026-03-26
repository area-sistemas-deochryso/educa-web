import { Injectable, inject } from '@angular/core';
import {
	VOICE_COMMANDS,
	MONTH_NAMES,
	VoiceCommandConfig,
} from './voice-commands.config';
import { VoiceCommandExecutorService } from './voice-command-executor.service';

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

/**
 * Result of processing a transcript.
 */
export interface MatchResult {
	/** Whether a command was matched. */
	matched: boolean;
	/** Description of the matched command (for UI feedback). */
	description?: string;
	/** If the transcript should be appended as text (no command matched). */
	plainText?: string;
}

/**
 * Callbacks the matcher needs from the main service.
 */
export interface MatcherCallbacks {
	emitCommand: (command: string, params?: string) => void;
	clearTranscript: () => void;
}

/**
 * Handles command pattern matching, modal lookup and transcript processing.
 * Stateless except for registered commands and modals.
 */
@Injectable({
	providedIn: 'root',
})
export class VoiceCommandMatcherService {
	// #region Dependencies
	private executor = inject(VoiceCommandExecutorService);
	// #endregion

	// #region State
	private commands: VoiceCommand[] = [];
	private registeredModals = new Map<string, RegisteredModal>();
	// #endregion

	// #region Initialization
	/**
	 * Load commands from the static configuration.
	 * Must be called once during bootstrap.
	 */
	loadCommandsFromConfig(callbacks: MatcherCallbacks): void {
		this.commands = VOICE_COMMANDS.map((config) =>
			this.configToCommand(config, callbacks),
		);
	}
	// #endregion

	// #region Transcript processing
	/**
	 * Process a transcript and return the match result.
	 *
	 * @param text Raw recognized text.
	 * @param callbacks Callbacks for emitting commands / clearing transcript.
	 * @returns Match result with description or plain text.
	 */
	processTranscript(text: string, callbacks: MatcherCallbacks): MatchResult {
		const normalizedText = this.normalizeText(text);

		// Month commands have priority
		const monthResult = this.processMonthCommand(normalizedText, callbacks);
		if (monthResult.matched) return monthResult;

		// Year command
		const yearMatch = normalizedText.match(/(20\d{2})/);
		if (yearMatch) {
			callbacks.emitCommand('change-year', yearMatch[1]);
			return { matched: true, description: `Cambiar a anio ${yearMatch[1]}` };
		}

		// Modal commands
		const modalResult = this.processModalCommand(normalizedText, callbacks);
		if (modalResult.matched) return modalResult;

		// Registered commands
		for (const command of this.commands) {
			for (const pattern of command.patterns) {
				const regex = new RegExp(`^${pattern}$`, 'i');
				const match = normalizedText.match(regex);

				if (match) {
					command.action(match[1]);
					return { matched: true, description: command.description };
				}
			}
		}

		return { matched: false };
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
	private configToCommand(
		config: VoiceCommandConfig,
		callbacks: MatcherCallbacks,
	): VoiceCommand {
		return {
			patterns: config.patterns,
			description: config.description,
			action: (params?: string) =>
				this.executor.execute(config, params, callbacks),
		};
	}

	/**
	 * Process month commands using month name matching.
	 */
	private processMonthCommand(
		text: string,
		callbacks: MatcherCallbacks,
	): MatchResult {
		const normalizedText = this.normalizeText(text);

		for (const [monthName, monthNumber] of Object.entries(MONTH_NAMES)) {
			if (normalizedText.includes(monthName)) {
				callbacks.emitCommand('change-month', monthNumber.toString());
				return { matched: true, description: `Cambiar a ${monthName}` };
			}
		}

		return { matched: false };
	}

	/**
	 * Process modal open and close commands.
	 */
	private processModalCommand(
		text: string,
		callbacks: MatcherCallbacks,
	): MatchResult {
		const openMatch = text.match(/^abrir\s+(.+)$/i);
		const closeMatch = text.match(/^cerrar\s+(.+)$/i);

		if (openMatch) {
			const modalName = openMatch[1].trim();
			const modal = this.findModal(modalName);
			if (modal) {
				modal.open();
				return { matched: true, description: `Abrir ${modal.name}` };
			}
			callbacks.emitCommand('open-modal', modalName);
			return { matched: true, description: `Abrir ${modalName}` };
		}

		if (closeMatch) {
			const modalName = closeMatch[1].trim();
			const modal = this.findModal(modalName);
			if (modal) {
				modal.close();
				return { matched: true, description: `Cerrar ${modal.name}` };
			}
			callbacks.emitCommand('close-modal', modalName);
			return { matched: true, description: `Cerrar ${modalName}` };
		}

		return { matched: false };
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
}
