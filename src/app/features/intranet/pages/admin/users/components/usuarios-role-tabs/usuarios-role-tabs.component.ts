import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ROLE_TAB_CONFIG, RoleTab } from '../../models';

@Component({
	selector: 'app-users-role-tabs',
	standalone: true,
	imports: [],
	templateUrl: './usuarios-role-tabs.component.html',
	styleUrl: './usuarios-role-tabs.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersRoleTabsComponent {
	readonly activeTab = input<RoleTab>(null);
	readonly tabChange = output<RoleTab>();
	readonly tabs = ROLE_TAB_CONFIG;

	onTabClick(tab: RoleTab): void {
		this.tabChange.emit(tab);
	}
}
