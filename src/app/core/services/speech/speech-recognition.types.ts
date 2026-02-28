/**
 * Typing interfaces for the Web SpeechRecognition API.
 */

export interface SpeechRecognitionErrorEvent extends Event {
	error:
		| 'no-speech'
		| 'aborted'
		| 'audio-capture'
		| 'network'
		| 'not-allowed'
		| 'service-not-allowed'
		| 'bad-grammar'
		| 'language-not-supported';
	message?: string;
}

export interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

export interface SpeechRecognitionResult {
	[index: number]: SpeechRecognitionAlternative;
	isFinal: boolean;
	length: number;
}

export interface SpeechRecognitionResultList {
	[index: number]: SpeechRecognitionResult;
	length: number;
}

export interface SpeechRecognitionEvent extends Event {
	resultIndex: number;
	results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionInstance extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
}

export interface SpeechRecognitionConstructor {
	new (): SpeechRecognitionInstance;
	prototype: SpeechRecognitionInstance;
}

export interface IWindow extends Window {
	SpeechRecognition?: SpeechRecognitionConstructor;
	webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
