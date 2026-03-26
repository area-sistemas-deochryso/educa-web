// Ubicación canónica de mensajes split por responsabilidad:
// - ui-confirm-messages.ts — Confirm dialog headers, labels, builders
// - ui-error-messages.ts — Error summaries, HTTP errors, backend error codes
// - ui-feature-messages.ts — Feature-specific messages (admin, horarios, salones, etc.)

// Re-export todo para compatibilidad con imports existentes
export * from './ui-confirm-messages';
export * from './ui-error-messages';
export * from './ui-feature-messages';
