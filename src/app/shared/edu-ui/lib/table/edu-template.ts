import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Legacy attribute-syntax template slot for edu-table (`<ng-template pTemplate="header">`).
 * Selector mirrors PrimeNG's own `pTemplate` on purpose — consumers migrating off `p-table`
 * that still use the attribute form don't need to rename their `<ng-template>` slots.
 */
@Directive({
	selector: '[pTemplate]',
	standalone: true,
})
export class EduTemplate {
	readonly pTemplate = input.required<string>();
	readonly templateRef = inject(TemplateRef<unknown>);
}
