export function resolveOptionLabel(option: unknown, optionLabel: string | undefined): string {
	if (optionLabel && typeof option === 'object' && option !== null) {
		return String((option as Record<string, unknown>)[optionLabel]);
	}
	return String(option);
}

export function resolveOptionValue(option: unknown, optionValue: string | undefined): unknown {
	if (optionValue && typeof option === 'object' && option !== null) {
		return (option as Record<string, unknown>)[optionValue];
	}
	return option;
}

export function filterOptionsByLabel<T>(options: T[], query: string, optionLabel: string | undefined): T[] {
	if (!query) {
		return options;
	}
	const normalized = query.toLowerCase();
	return options.filter((option) => resolveOptionLabel(option, optionLabel).toLowerCase().includes(normalized));
}
