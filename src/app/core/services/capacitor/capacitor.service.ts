// #region Imports
import { Injectable, signal, computed } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { logger } from '@core/helpers';
// #endregion

// #region Implementation
/**
 * Unified Capacitor service for native platform features.
 *
 * Wraps all Capacitor plugins behind platform checks so callers
 * don't need to worry about running on web vs native.
 */
@Injectable({ providedIn: 'root' })
export class CapacitorService {
	// #region Platform detection
	readonly isNative = Capacitor.isNativePlatform();
	readonly platform = Capacitor.getPlatform();

	private readonly _statusBarVisible = signal(true);
	readonly statusBarVisible = this._statusBarVisible.asReadonly();
	readonly isAndroid = computed(() => this.platform === 'android');
	readonly isIos = computed(() => this.platform === 'ios');
	// #endregion

	// #region Initialization
	async initialize(): Promise<void> {
		if (!this.isNative) return;

		try {
			await this.configureStatusBar();
			await this.hideSplashScreen();
			await this.requestNotificationPermissions();
			logger.log(`[Capacitor] Initialized on ${this.platform}`);
		} catch (error) {
			logger.error('[Capacitor] Initialization error:', error);
		}
	}
	// #endregion

	// #region Status Bar
	private async configureStatusBar(): Promise<void> {
		const { StatusBar, Style } = await import('@capacitor/status-bar');
		await StatusBar.setStyle({ style: Style.Light });
		await StatusBar.setOverlaysWebView({ overlay: false });
	}

	async setStatusBarLight(): Promise<void> {
		if (!this.isNative) return;
		const { StatusBar, Style } = await import('@capacitor/status-bar');
		await StatusBar.setStyle({ style: Style.Light });
	}

	async setStatusBarDark(): Promise<void> {
		if (!this.isNative) return;
		const { StatusBar, Style } = await import('@capacitor/status-bar');
		await StatusBar.setStyle({ style: Style.Dark });
	}

	async hideStatusBar(): Promise<void> {
		if (!this.isNative) return;
		const { StatusBar } = await import('@capacitor/status-bar');
		await StatusBar.hide();
		this._statusBarVisible.set(false);
	}

	async showStatusBar(): Promise<void> {
		if (!this.isNative) return;
		const { StatusBar } = await import('@capacitor/status-bar');
		await StatusBar.show();
		this._statusBarVisible.set(true);
	}
	// #endregion

	// #region Splash Screen
	private async hideSplashScreen(): Promise<void> {
		const { SplashScreen } = await import('@capacitor/splash-screen');
		await SplashScreen.hide({ fadeOutDuration: 300 });
	}
	// #endregion

	// #region Camera
	async takePhoto(source: 'camera' | 'gallery' = 'camera'): Promise<string | null> {
		try {
			const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
			const photo = await Camera.getPhoto({
				quality: 80,
				allowEditing: false,
				resultType: CameraResultType.Base64,
				source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
				width: 800,
				height: 800,
			});

			if (photo.base64String) {
				return `data:image/${photo.format};base64,${photo.base64String}`;
			}
			return null;
		} catch (error) {
			logger.debug('[Capacitor] Camera cancelled or error:', error);
			return null;
		}
	}

	async pickFromGallery(): Promise<string | null> {
		return this.takePhoto('gallery');
	}
	// #endregion

	// #region Filesystem
	async saveFile(fileName: string, data: string, isBase64 = false): Promise<string | null> {
		try {
			const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
			const result = await Filesystem.writeFile({
				path: fileName,
				data,
				directory: Directory.Documents,
				encoding: isBase64 ? undefined : Encoding.UTF8,
			});
			logger.log(`[Capacitor] File saved: ${fileName}`);
			return result.uri;
		} catch (error) {
			logger.error('[Capacitor] Error saving file:', error);
			return null;
		}
	}

	async readFile(fileName: string): Promise<string | null> {
		try {
			const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
			const result = await Filesystem.readFile({
				path: fileName,
				directory: Directory.Documents,
				encoding: Encoding.UTF8,
			});
			return result.data as string;
		} catch (error) {
			logger.error('[Capacitor] Error reading file:', error);
			return null;
		}
	}

	async deleteFile(fileName: string): Promise<boolean> {
		try {
			const { Filesystem, Directory } = await import('@capacitor/filesystem');
			await Filesystem.deleteFile({
				path: fileName,
				directory: Directory.Documents,
			});
			return true;
		} catch (error) {
			logger.error('[Capacitor] Error deleting file:', error);
			return false;
		}
	}

	async downloadBlob(blob: Blob, fileName: string): Promise<string | null> {
		if (!this.isNative) return null;

		try {
			const { Filesystem, Directory } = await import('@capacitor/filesystem');
			const base64 = await this.blobToBase64(blob);
			const result = await Filesystem.writeFile({
				path: fileName,
				data: base64,
				directory: Directory.Documents,
			});
			logger.log(`[Capacitor] Downloaded: ${fileName}`);
			return result.uri;
		} catch (error) {
			logger.error('[Capacitor] Error downloading blob:', error);
			return null;
		}
	}

	private blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const base64 = (reader.result as string).split(',')[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}
	// #endregion

	// #region Local Notifications
	private async requestNotificationPermissions(): Promise<void> {
		const { LocalNotifications } = await import('@capacitor/local-notifications');
		const permission = await LocalNotifications.checkPermissions();
		if (permission.display !== 'granted') {
			await LocalNotifications.requestPermissions();
		}
	}

	async notify(title: string, body: string, id?: number): Promise<void> {
		if (!this.isNative) return;

		const { LocalNotifications } = await import('@capacitor/local-notifications');
		await LocalNotifications.schedule({
			notifications: [
				{
					title,
					body,
					id: id ?? Date.now(),
					schedule: { at: new Date(Date.now() + 100) },
					sound: undefined,
					smallIcon: 'ic_stat_icon',
					iconColor: '#4f46e5',
				},
			],
		});
	}

	async cancelAllNotifications(): Promise<void> {
		if (!this.isNative) return;
		const { LocalNotifications } = await import('@capacitor/local-notifications');
		const pending = await LocalNotifications.getPending();
		if (pending.notifications.length > 0) {
			await LocalNotifications.cancel(pending);
		}
	}
	// #endregion
}
// #endregion
