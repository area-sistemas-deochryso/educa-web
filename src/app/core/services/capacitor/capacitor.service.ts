// #region Imports
import { Injectable, signal, computed } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
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
	readonly platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

	private readonly _statusBarVisible = signal(true);
	readonly statusBarVisible = this._statusBarVisible.asReadonly();
	readonly isAndroid = computed(() => this.platform === 'android');
	readonly isIos = computed(() => this.platform === 'ios');
	// #endregion

	// #region Initialization
	/**
	 * Initialize native plugins. Call once from AppComponent constructor.
	 */
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
		await StatusBar.setStyle({ style: Style.Light });
		await StatusBar.setOverlaysWebView({ overlay: false });
	}

	async setStatusBarLight(): Promise<void> {
		if (!this.isNative) return;
		await StatusBar.setStyle({ style: Style.Light });
	}

	async setStatusBarDark(): Promise<void> {
		if (!this.isNative) return;
		await StatusBar.setStyle({ style: Style.Dark });
	}

	async hideStatusBar(): Promise<void> {
		if (!this.isNative) return;
		await StatusBar.hide();
		this._statusBarVisible.set(false);
	}

	async showStatusBar(): Promise<void> {
		if (!this.isNative) return;
		await StatusBar.show();
		this._statusBarVisible.set(true);
	}
	// #endregion

	// #region Splash Screen
	private async hideSplashScreen(): Promise<void> {
		await SplashScreen.hide({ fadeOutDuration: 300 });
	}
	// #endregion

	// #region Camera
	/**
	 * Take a photo or pick from gallery.
	 * Returns base64 data URI or null if cancelled.
	 */
	async takePhoto(source: 'camera' | 'gallery' = 'camera'): Promise<string | null> {
		try {
			const photo: Photo = await Camera.getPhoto({
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
			// User cancelled
			logger.debug('[Capacitor] Camera cancelled or error:', error);
			return null;
		}
	}

	/**
	 * Pick a photo from gallery.
	 */
	async pickFromGallery(): Promise<string | null> {
		return this.takePhoto('gallery');
	}
	// #endregion

	// #region Filesystem
	/**
	 * Save a file to the device. Returns the saved file URI.
	 */
	async saveFile(fileName: string, data: string, isBase64 = false): Promise<string | null> {
		try {
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

	/**
	 * Read a file from the device.
	 */
	async readFile(fileName: string): Promise<string | null> {
		try {
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

	/**
	 * Delete a file from the device.
	 */
	async deleteFile(fileName: string): Promise<boolean> {
		try {
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

	/**
	 * Download a blob (e.g. from API) and save to device Downloads folder.
	 */
	async downloadBlob(blob: Blob, fileName: string): Promise<string | null> {
		if (!this.isNative) return null;

		try {
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
		const permission = await LocalNotifications.checkPermissions();
		if (permission.display !== 'granted') {
			await LocalNotifications.requestPermissions();
		}
	}

	/**
	 * Show a local notification on the device.
	 */
	async notify(title: string, body: string, id?: number): Promise<void> {
		if (!this.isNative) return;

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

	/**
	 * Cancel all pending local notifications.
	 */
	async cancelAllNotifications(): Promise<void> {
		if (!this.isNative) return;
		const pending = await LocalNotifications.getPending();
		if (pending.notifications.length > 0) {
			await LocalNotifications.cancel(pending);
		}
	}
	// #endregion
}
// #endregion
