import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { UserPermissionsService, SessionActivityService, KeyboardShortcutsService, FeedbackReportFacade } from '@core/services';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { QuickAccessFavoritesService } from '@intranet-shared/services';

import { IntranetLayoutComponent } from './intranet-layout.component';
import { FeedbackReportDialogComponent } from '@intranet-shared/components/feedback-report-dialog';
import { FeedbackReportLauncherComponent } from '@intranet-shared/components/feedback-report-launcher';
import { VoiceButtonComponent } from '@intranet-shared/components/voice-button';
import { FloatingNotificationBellComponent } from '@intranet-shared/components/floating-notification-bell';
import { SyncStatusComponent } from '@intranet-shared/components/sync-status';
import { OfflineIndicatorComponent } from '@intranet-shared/components/offline-indicator/offline-indicator.component';
import { AccessDeniedModalComponent } from '@intranet-shared/components/access-denied-modal';
import { WalMigrationBannerComponent } from '@intranet-shared/components/wal-migration-banner';
import { WalDegradedBannerComponent } from '@intranet-shared/components/wal-degraded-banner';
import { ConnectionStatusIndicatorComponent } from '@intranet-shared/components/connection-status-indicator/connection-status-indicator.component';

@Component({ selector: 'app-feedback-report-dialog', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubFeedbackReportDialogComponent {}

@Component({ selector: 'app-feedback-report-launcher', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubFeedbackReportLauncherComponent {}

@Component({ selector: 'app-voice-button', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubVoiceButtonComponent {}

@Component({ selector: 'app-floating-notification-bell', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubFloatingNotificationBellComponent {}

@Component({ selector: 'app-sync-status', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubSyncStatusComponent {}

@Component({ selector: 'app-offline-indicator', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubOfflineIndicatorComponent {}

@Component({ selector: 'app-access-denied-modal', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubAccessDeniedModalComponent {}

@Component({ selector: 'app-wal-migration-banner', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubWalMigrationBannerComponent {}

@Component({ selector: 'app-wal-degraded-banner', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubWalDegradedBannerComponent {}

@Component({ selector: 'app-connection-status-indicator', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class StubConnectionStatusIndicatorComponent {}

function mockUserPermissionsService() {
	return {
		loaded: signal(true),
		vistasPermitidas: signal<string[]>([]),
		userCapabilities: signal(new Set<string>()),
		loadPermisos: vi.fn(),
	};
}

function mockSessionActivity() {
	return { start: vi.fn(), forceLogout: vi.fn() };
}

function mockKeyboardService() {
	return { register: vi.fn(), unregister: vi.fn() };
}

function mockFeatureFlags() {
	return { isEnabled: () => false };
}

function mockFeedbackFacade() {
	return { toggle: vi.fn(), close: vi.fn() };
}

function mockFavoritesService() {
	return { toggleFavorite: vi.fn(), isFavorite: () => false };
}

describe('IntranetLayoutComponent', () => {
	let fixture: ComponentFixture<IntranetLayoutComponent>;
	let component: IntranetLayoutComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [IntranetLayoutComponent],
			providers: [
				provideRouter([]),
				{ provide: UserPermissionsService, useFactory: mockUserPermissionsService },
				{ provide: SessionActivityService, useFactory: mockSessionActivity },
				{ provide: KeyboardShortcutsService, useFactory: mockKeyboardService },
				{ provide: FeatureFlagsFacade, useFactory: mockFeatureFlags },
				{ provide: FeedbackReportFacade, useFactory: mockFeedbackFacade },
				{ provide: QuickAccessFavoritesService, useFactory: mockFavoritesService },
			],
		});
		TestBed.overrideComponent(IntranetLayoutComponent, {
			remove: {
				imports: [
					FeedbackReportDialogComponent, FeedbackReportLauncherComponent,
					VoiceButtonComponent, FloatingNotificationBellComponent,
					SyncStatusComponent, OfflineIndicatorComponent,
					AccessDeniedModalComponent, WalMigrationBannerComponent, WalDegradedBannerComponent, ConnectionStatusIndicatorComponent,
				],
			},
			add: {
				imports: [
					StubFeedbackReportDialogComponent, StubFeedbackReportLauncherComponent,
					StubVoiceButtonComponent, StubFloatingNotificationBellComponent,
					StubSyncStatusComponent, StubOfflineIndicatorComponent,
					StubAccessDeniedModalComponent, StubWalMigrationBannerComponent, StubWalDegradedBannerComponent, StubConnectionStatusIndicatorComponent,
				],
			},
		});
		fixture = TestBed.createComponent(IntranetLayoutComponent);
		component = fixture.componentInstance;
	});

	it('creates', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('starts with modulo inicio selected', () => {
		fixture.detectChanges();
		expect(component.selectedModuloId()).toBe('inicio');
	});

	it('returns empty nav items for inicio', () => {
		fixture.detectChanges();
		expect(component.visibleNavItems()).toEqual([]);
	});

	it('calls sessionActivity.start on init', () => {
		const sessionActivity = TestBed.inject(SessionActivityService);
		fixture.detectChanges();
		expect(sessionActivity.start).toHaveBeenCalled();
	});

	it('calls forceLogout with reason "manual" on logout()', () => {
		const sessionActivity = TestBed.inject(SessionActivityService);
		fixture.detectChanges();
		component.logout();
		expect(sessionActivity.forceLogout).toHaveBeenCalledWith('manual');
	});

	it('selectModulo changes selectedModuloId', () => {
		fixture.detectChanges();
		component.selectModulo('estudiante');
		expect(component.selectedModuloId()).toBe('estudiante');
	});

	it('selectModulo inicio navigates to /intranet', () => {
		const router = TestBed.inject(Router);
		const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
		fixture.detectChanges();
		component.selectModulo('inicio');
		expect(spy).toHaveBeenCalledWith(['/intranet']);
	});

	it('mobileMenuOpen defaults to false', () => {
		fixture.detectChanges();
		expect(component.mobileMenuOpen()).toBe(false);
	});

	it('registers keyboard shortcuts on init when features disabled', () => {
		const keyboardService = TestBed.inject(KeyboardShortcutsService);
		fixture.detectChanges();
		// command-palette always registered
		expect(keyboardService.register).toHaveBeenCalledWith('open-command-palette', expect.any(Function));
	});

	it('unregisters keyboard shortcuts on destroy', () => {
		const keyboardService = TestBed.inject(KeyboardShortcutsService);
		fixture.detectChanges();
		fixture.destroy();
		expect(keyboardService.unregister).toHaveBeenCalledWith('open-feedback-report');
		expect(keyboardService.unregister).toHaveBeenCalledWith('open-command-palette');
	});
});
