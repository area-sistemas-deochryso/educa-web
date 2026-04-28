import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { logger } from '@core/helpers/logs/logger';

import {
	CorreoIndividualErrorCode,
	PersonaConCorreoDto,
} from '../models/correo-individual.models';

import { CorreoIndividualService } from './correo-individual.service';
import { CorreoIndividualStore } from './correo-individual.store';

const LOG_TAG = 'DiagnosticoCorreo:Facade';
const CORREO_MAX_LENGTH = 200;
// * Typeahead — el BE valida ≥ 2 chars; aquí filtramos local para evitar requests inútiles.
const SUGERENCIAS_MIN_LENGTH = 2;
const SUGERENCIAS_DEBOUNCE_MS = 300;

@Injectable({ providedIn: 'root' })
export class CorreoIndividualFacade {
	// #region Dependencias
	private api = inject(CorreoIndividualService);
	private store = inject(CorreoIndividualStore);
	private destroyRef = inject(DestroyRef);
	private errorHandler = inject(ErrorHandlerService);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Typeahead — Plan 36 Chat 4b
	private readonly buscarSugerencias$ = new Subject<string>();

	constructor() {
		// * Pipeline de typeahead: switchMap cancela requests viejas si el admin sigue tipeando.
		this.buscarSugerencias$
			.pipe(
				debounceTime(SUGERENCIAS_DEBOUNCE_MS),
				distinctUntilChanged(),
				tap((q) => {
					if (q.length < SUGERENCIAS_MIN_LENGTH) {
						this.store.clearSugerencias();
						this.store.setLoadingSugerencias(false);
					} else {
						this.store.setLoadingSugerencias(true);
					}
				}),
				switchMap((q) => {
					if (q.length < SUGERENCIAS_MIN_LENGTH) return of(null);
					return this.api.buscarPersonas(q).pipe(
						catchError((err: unknown) => {
							logger.tagged(LOG_TAG, 'warn', 'sugerencias_error', err);
							return of(null);
						}),
					);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((res) => {
				this.store.setLoadingSugerencias(false);
				if (!res) {
					this.store.clearSugerencias();
					return;
				}
				this.store.setSugerencias(res.personas, res.total);
			});
	}

	onTypeaheadQuery(q: string): void {
		this.buscarSugerencias$.next((q ?? '').trim());
	}

	seleccionarPersona(persona: PersonaConCorreoDto): void {
		this.store.setCorreoInput(persona.correo);
		this.buscar(persona.correo);
	}
	// #endregion

	// #region Comandos
	setCorreoInput(value: string): void {
		this.store.setCorreoInput(value);
	}

	buscar(correoRaw: string): void {
		const correo = (correoRaw ?? '').trim();

		// * Validación local: evita un round-trip al BE por formato obviamente inválido.
		// * El BE re-valida igual (INV-MAIL01), esto es solo para UX.
		if (!correo) {
			this.errorHandler.showError(
				'Diagnóstico por correo',
				'El correo es obligatorio.',
			);
			this.store.setError('CORREO_REQUERIDO');
			return;
		}

		if (correo.length > CORREO_MAX_LENGTH || !correo.includes('@')) {
			this.errorHandler.showError(
				'Diagnóstico por correo',
				'El correo no tiene un formato válido.',
			);
			this.store.setError('CORREO_INVALIDO');
			return;
		}

		this.store.setLoading(true);
		this.store.setError(null);
		logger.tagged(LOG_TAG, 'info', 'buscar', {});

		this.api
			.obtenerDiagnostico(correo)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (dto) => {
					this.store.setDto(dto);
					this.store.setLoading(false);
				},
				error: (err: unknown) => {
					this.handleError(err);
					this.store.setLoading(false);
				},
			});
	}

	limpiar(): void {
		this.store.clear();
	}
	// #endregion

	// #region Error mapping
	private handleError(err: unknown): void {
		const errorCode = this.extractErrorCode(err);

		if (errorCode) {
			const message = this.extractServerMessage(err) ?? this.getErrorMessage(errorCode);
			this.errorHandler.showError('Diagnóstico por correo', message);
			this.store.setError(errorCode);
			logger.tagged(LOG_TAG, 'warn', 'error_code', { errorCode });
			return;
		}

		this.errorHandler.showError(
			'Diagnóstico por correo',
			'No se pudo obtener el diagnóstico. Intenta nuevamente.',
		);
		this.store.setError('UNKNOWN');
		logger.tagged(LOG_TAG, 'error', 'unknown_error', err);
	}

	private extractErrorCode(err: unknown): CorreoIndividualErrorCode | null {
		if (!(err instanceof HttpErrorResponse)) return null;
		if (err.status !== 400) return null;
		const code = (err.error as { errorCode?: string } | null)?.errorCode;
		if (code === 'CORREO_REQUERIDO' || code === 'CORREO_INVALIDO') {
			return code;
		}
		return null;
	}

	private extractServerMessage(err: unknown): string | null {
		if (!(err instanceof HttpErrorResponse)) return null;
		const msg = (err.error as { message?: string } | null)?.message;
		return typeof msg === 'string' && msg.length > 0 ? msg : null;
	}

	private getErrorMessage(code: CorreoIndividualErrorCode): string {
		switch (code) {
			case 'CORREO_REQUERIDO':
				return 'El correo es obligatorio.';
			case 'CORREO_INVALIDO':
				return 'El correo no tiene un formato válido.';
		}
	}
	// #endregion
}
