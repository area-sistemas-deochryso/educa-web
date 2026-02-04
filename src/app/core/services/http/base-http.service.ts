import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface RequestOptions {
	headers?: HttpHeaders | Record<string, string>;
	params?: HttpParams | Record<string, string | string[]>;
}

@Injectable({
	providedIn: 'root',
})
export class BaseHttpService {
	// * Shared base class for API services.
	protected http = inject(HttpClient);
	// Base URL stays centralized here to keep derived services consistent.
	protected baseUrl = environment.apiUrl;

	protected get<T>(endpoint: string, options?: RequestOptions): Observable<T> {
		return this.http.get<T>(`${this.baseUrl}${endpoint}`, options);
	}

	protected post<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
		return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, options);
	}

	protected put<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
		return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, options);
	}

	protected patch<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
		return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, options);
	}

	protected delete<T>(endpoint: string, options?: RequestOptions): Observable<T> {
		return this.http.delete<T>(`${this.baseUrl}${endpoint}`, options);
	}

	protected buildParams(params: Record<string, unknown>): HttpParams {
		let httpParams = new HttpParams();

		Object.entries(params).forEach(([key, value]) => {
			// Ignore nullish values to avoid sending "param=null" or "param=undefined".
			if (value !== undefined && value !== null) {
				httpParams = httpParams.set(key, String(value));
			}
		});

		return httpParams;
	}
}
