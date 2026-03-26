import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
	VoiceCommandConfig,
	VoiceCommandContext,
	ScrollDirection,
} from './voice-commands.config';

/**
 * Executes voice commands by type: navigate, emit, scroll or custom.
 */
@Injectable({
	providedIn: 'root',
})
export class VoiceCommandExecutorService {
	// #region Dependencies
	private router = inject(Router);
	// #endregion

	// #region Public API
	/**
	 * Execute a command config with the given context helpers.
	 *
	 * @param config The command configuration to execute.
	 * @param params Optional captured params from pattern match.
	 * @param contextHelpers Callbacks the main service provides.
	 */
	execute(
		config: VoiceCommandConfig,
		params: string | undefined,
		contextHelpers: Pick<VoiceCommandContext, 'emitCommand' | 'clearTranscript'>,
	): void {
		const context: VoiceCommandContext = {
			router: this.router,
			emitCommand: contextHelpers.emitCommand,
			clearTranscript: contextHelpers.clearTranscript,
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
					contextHelpers.emitCommand(config.emitCommand, params);
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
	// #endregion

	// #region Private helpers
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
}
