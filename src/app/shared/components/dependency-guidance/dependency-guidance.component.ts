import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

export interface DependencyCheck {
	label: string;
	satisfied: boolean;
	count?: number;
	targetUrl: string;
	targetLabel: string;
}

@Component({
	selector: 'app-dependency-guidance',
	standalone: true,
	imports: [CommonModule, ButtonModule, MessageModule],
	templateUrl: './dependency-guidance.component.html',
	styleUrl: './dependency-guidance.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependencyGuidanceComponent {
	readonly checks = input.required<DependencyCheck[]>();

	readonly missingChecks = computed(() => this.checks().filter((c) => !c.satisfied));
	readonly satisfiedChecks = computed(() => this.checks().filter((c) => c.satisfied));
	readonly hasMissing = computed(() => this.missingChecks().length > 0);
	readonly isBannerMode = computed(() => this.missingChecks().length >= 2);

	openInNewTab(url: string): void {
		window.open(url, '_blank');
	}
}
