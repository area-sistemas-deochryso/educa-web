import { Signal, effect, signal } from '@angular/core';

import { HijoApoderado } from '@data/models';

/**
 * Estado local del buscador de personas en modo mes (barra de filtro unificada).
 * Sincroniza el término de búsqueda con la persona seleccionada del componente host.
 */
export class MonthSearchState {
	readonly monthSearchTerm = signal('');
	readonly monthShowSuggestions = signal(false);

	private readonly syncSearchWithSelection = effect(() => {
		const person = this.selectedPerson();
		if (person && !this.monthShowSuggestions()) {
			this.monthSearchTerm.set(person.nombreCompleto);
		}
	});

	constructor(
		private readonly selectedPerson: Signal<{ nombreCompleto: string } | null>,
		private readonly selectPerson: (personId: number) => void,
	) {}

	filteredPeople(hijos: HijoApoderado[]): HijoApoderado[] {
		const term = this.monthSearchTerm().toLowerCase().trim();
		if (!term) return hijos;
		return hijos.filter(
			(h) =>
				h.nombreCompleto.toLowerCase().includes(term) ||
				(h.dni && h.dni.toLowerCase().includes(term)),
		);
	}

	onMonthSearchFocus(): void {
		this.monthSearchTerm.set('');
		this.monthShowSuggestions.set(true);
	}

	onMonthSearchBlur(): void {
		setTimeout(() => {
			this.monthShowSuggestions.set(false);
			const person = this.selectedPerson();
			if (person) this.monthSearchTerm.set(person.nombreCompleto);
		}, 200);
	}

	selectPersonFromSearch(personId: number): void {
		this.selectPerson(personId);
		this.monthShowSuggestions.set(false);
	}
}
