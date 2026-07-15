import { test, expect, type Page } from '@playwright/test';

// * Happy-path e2e: Curso -> Horario -> Salon.
//
// Flow:
//   1. Log in as an admin/coordinator (role "Administrador").
//   2. Go to /intranet/admin/horarios, open "Nuevo Horario", pick day/time/salon/curso
//      that shouldn't conflict with existing data (only Lunes-Viernes and 07:00-17:00 are
//      selectable; the last slot of the day is least likely to already be occupied), save.
//   3. Assert the new horario shows up in the "Por Salón" grid for the chosen salon.
//   4. Go to /intranet/admin/salones and use the "Ver horarios de este salón" action
//      (salones-admin-table.component.html) to navigate back to /intranet/admin/horarios
//      filtered by that salon (contextSalonId) and re-confirm the horario is there.
//
// WHY not a stronger salones-page assertion: salones-admin.component.html doesn't render
// horarios inline in the main table — it only exposes a "Ver horarios de este salón" button
// that navigates to the horarios page with a salonId query param. So step 4 verifies the
// association via that navigation instead of an in-place assertion on the salones screen.

// Credentials are intentionally NOT hardcoded — provide a real test admin account via env vars.
const ADMIN_DNI = process.env.TEST_ADMIN_DNI;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

async function login(page: Page): Promise<void> {
	await page.goto('/intranet/login');

	// Stored sessions (quick-login) may be present from a previous run; force the form.
	const useOtherAccount = page.getByText('Usar otra cuenta');
	if (await useOtherAccount.isVisible().catch(() => false)) {
		await useOtherAccount.click();
	}

	await page.getByPlaceholder('DNI').fill(ADMIN_DNI!);
	await page.getByPlaceholder('Contraseña').fill(ADMIN_PASSWORD!);

	// PrimeNG p-select role selector — click to open, then choose the "Administrador" option.
	await page.locator('app-login-role-selector p-select').click();
	await page.getByRole('option', { name: 'Administrador' }).click();

	await page.getByRole('button', { name: /Iniciar sesión|Ingresar/i }).click();
	// Post-login lands on the dashboard (/intranet), not directly under /intranet/admin.
	await expect(page).toHaveURL(/\/intranet(\/|$)/, { timeout: 15_000 });
}

test.describe('Curso -> Horario -> Salon (happy path)', () => {
	test.skip(
		!ADMIN_DNI || !ADMIN_PASSWORD,
		'Requires TEST_ADMIN_DNI and TEST_ADMIN_PASSWORD env vars for a real admin account.',
	);

	test('crea un horario para un curso y salon, y se refleja al navegar desde Salones', async ({
		page,
	}) => {
		await login(page);

		// #region Step 1: create horario
		// Navigate via the app's own nav (not page.goto) — a hard reload drops the in-memory
		// auth/session state and bounces back to the login screen.
		await page.locator('a[href="/intranet/admin/horarios"]').first().click();
		await expect(page).toHaveURL(/\/intranet\/admin\/horarios/);
		await expect(page.getByRole('button', { name: 'Nuevo Horario' })).toBeVisible();
		await page.getByRole('button', { name: 'Nuevo Horario' }).click();

		const dialog = page.getByRole('dialog').filter({ hasText: 'Crear Horario' });
		await expect(dialog).toBeVisible();

		// Viernes 16:00-17:00: solo Lunes-Viernes están disponibles como opción (no hay fin
		// de semana), y el form valida que la hora de inicio caiga dentro de HORAS_DIA
		// (07:00-17:00, el rango que la grilla semanal realmente renderiza) — la última
		// franja del día es la menos probable de chocar con datos ya sembrados.
		await dialog.locator('#diaSemana').click();
		await page.getByRole('option', { name: 'Viernes' }).click();

		// These are masked 12h HH:MM AM/PM time inputs — .fill() sets the raw value without
		// the keystroke events the mask needs, leaving the form invalid. Typing the literal
		// colon confuses the mask's auto-advance (it reorders digits); typing digits + the
		// AM/PM suffix (the mask inserts the colon itself) is what actually works.
		const horaInicio = dialog.locator('#horaInicio');
		await horaInicio.click();
		await horaInicio.press('Home');
		await horaInicio.pressSequentially('0400PM', { delay: 150 });
		const horaFin = dialog.locator('#horaFin');
		await horaFin.click();
		await horaFin.press('Home');
		await horaFin.pressSequentially('0500PM', { delay: 150 });

		// Salon: open the filterable p-select and take the first available option.
		await dialog.locator('#salon').click();
		const salonOption = page.locator('.p-select-overlay .p-select-option').first();
		await expect(salonOption).toBeVisible();
		const salonLabel = (await salonOption.locator('.font-semibold').textContent())?.trim();
		await salonOption.click();

		// Curso: opens the level-tabbed picker modal, pick the first course of "Primaria".
		await dialog.getByRole('button', { name: /Seleccionar curso/i }).click();
		const cursoDialog = page.getByRole('dialog').filter({ hasText: 'Seleccionar Curso por Nivel Educativo' });
		await expect(cursoDialog).toBeVisible();
		await cursoDialog.getByRole('tab', { name: /Primaria/i }).click();
		// Every level's tabpanel stays in the DOM (only the active one is visible), so
		// scoping to the tabpanel by name avoids matching a hidden .curso-card elsewhere.
		const primariaPanel = cursoDialog.getByRole('tabpanel', { name: /Primaria/i });
		// Clicking a card selects the course and auto-closes the picker dialog —
		// there's no separate "Confirmar" step for single selection.
		await primariaPanel.locator('.curso-card').first().click();
		await expect(cursoDialog).toBeHidden();

		// The "Salon" options refresh async against day/time, which briefly keeps the form
		// pending after the last field is filled — give the submit button time to enable.
		const crearButton = dialog.getByRole('button', { name: 'Crear' });
		await expect(crearButton).toBeEnabled({ timeout: 10_000 });
		await crearButton.click();
		await expect(dialog).toBeHidden();
		// #endregion

		// #region Step 2: verify it shows up in the "Por Salón" grid
		await page.getByRole('button', { name: 'Por Salón' }).click();
		await page.getByText(salonLabel!).first().click();
		// The newly-created block for Viernes 16:00-17:00 should render somewhere in the grid.
		await expect(page.getByText('16:00', { exact: false }).first()).toBeVisible();
		// #endregion

		// #region Step 3: from Salones, navigate to the horarios filtered by that salon
		// The nav-bar "Administración" link only reveals its dropdown items (Salones,
		// Horarios, etc.) once opened — it's not a persistently-visible sidebar.
		await page.getByRole('button', { name: 'Administración', exact: false }).click();
		await page.locator('a[href="/intranet/admin/salones"]').first().click();
		await expect(page).toHaveURL(/\/intranet\/admin\/salones/);
		// The salones table splits grado/sección/sede into separate cells — salonLabel's
		// " - Sede X" formatting (from the horario dialog's p-select) has no literal match
		// in the row's concatenated text, so match on the grado+sección prefix only.
		const salonRowText = salonLabel!.split(' - ')[0];
		const salonRow = page.getByRole('row', { name: new RegExp(salonRowText) }).first();
		const verHorariosButton = salonRow.getByRole('button', { name: 'Ver horarios de este salón' });
		// The Acciones column sits past the table's horizontal scroll edge at default viewport width.
		await verHorariosButton.scrollIntoViewIfNeeded();
		await verHorariosButton.click();

		await expect(page).toHaveURL(/\/intranet\/admin\/horarios\?salonId=/);
		await expect(page.getByText('16:00', { exact: false }).first()).toBeVisible();
		// #endregion
	});
});
