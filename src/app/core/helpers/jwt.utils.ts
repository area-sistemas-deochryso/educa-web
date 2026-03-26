// #region JWT utilities

/**
 * Decode JWT exp claim and check if the token is expired.
 *
 * Pure function — no Angular dependencies.
 *
 * @param token JWT token string.
 * @returns True if expired or if the token is malformed.
 */
export function isJwtExpired(token: string): boolean {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		return Date.now() / 1000 > payload.exp;
	} catch {
		return true;
	}
}

// #endregion
