// Vendored from educa-libs (packages/edu-ui/src) — commit 614fbaa (content 290803d),
// 2026-08-24. Not published to a registry (P79 F6); source-of-truth stays in
// educa-libs, re-sync manually on changes.
//
// F1 — Foundation + trivial components (CSS-only wrappers).
// Design tokens: import 'dist/edu-ui/tokens.css' in the consuming app (F6).

export { EduButton } from './lib/button/edu-button';
export type { EduButtonSeverity, EduButtonSize } from './lib/button/edu-button';

export { EduPtRoot } from './lib/passthrough/edu-pt-root';
export type { EduPassThrough, EduPassThroughRoot } from './lib/passthrough/edu-pt-root';

export { EduTooltip } from './lib/tooltip/edu-tooltip';
export type { EduTooltipPosition } from './lib/tooltip/edu-tooltip';

export { EduTag } from './lib/tag/edu-tag';
export type { EduTagSeverity } from './lib/tag/edu-tag';

export { EduInputText } from './lib/input-text/edu-input-text';
export { EduTextarea } from './lib/textarea/edu-textarea';

export { EduSpinner } from './lib/spinner/edu-spinner';

export { EduToggle } from './lib/toggle/edu-toggle';

export { EduCheckbox } from './lib/checkbox/edu-checkbox';

export { EduSkeleton } from './lib/skeleton/edu-skeleton';
export type { EduSkeletonShape } from './lib/skeleton/edu-skeleton';

export { EduBadge } from './lib/badge/edu-badge';
export type { EduBadgeSeverity } from './lib/badge/edu-badge';

export { EduAvatar } from './lib/avatar/edu-avatar';
export type { EduAvatarSize } from './lib/avatar/edu-avatar';

export { EduDivider } from './lib/divider/edu-divider';
export type { EduDividerLayout } from './lib/divider/edu-divider';

export { EduMessage } from './lib/message/edu-message';
export type { EduMessageSeverity } from './lib/message/edu-message';

export { EduProgressBar } from './lib/progress-bar/edu-progress-bar';
export type { EduProgressBarMode } from './lib/progress-bar/edu-progress-bar';

export { EduCard } from './lib/card/edu-card';

// F2a — CDK Overlay + FocusTrap foundation. Requires @angular/cdk/overlay-prebuilt.css
// (backdrop/positioning base styles) imported once in the consuming app, alongside tokens.css.
export { EduDialog } from './lib/dialog/edu-dialog';

export { EduDrawer } from './lib/drawer/edu-drawer';
export type { EduDrawerPosition } from './lib/drawer/edu-drawer';

export { EduConfirmDialog } from './lib/confirm-dialog/edu-confirm-dialog';
export { EduConfirmationService } from './lib/confirm-dialog/edu-confirmation.service';
export type { EduConfirmation } from './lib/confirm-dialog/edu-confirmation.service';

export { EduMenu } from './lib/menu/edu-menu';
export type { EduMenuItem, EduMenuItemCommandEvent } from './lib/menu/edu-menu';

// F2b — Tabs, Accordion, Stepper (composable, value-based, no CDK).
export { EduAccordion } from './lib/accordion/edu-accordion';
export { EduAccordionPanel } from './lib/accordion/edu-accordion-panel';
export { EduAccordionHeader } from './lib/accordion/edu-accordion-header';

export { EduTabs } from './lib/tabs/edu-tabs';
export { EduTab } from './lib/tabs/edu-tab';
export { EduTabPanel } from './lib/tabs/edu-tabpanel';
export type { EduTabValue } from './lib/tabs/edu-tabs.service';

export { EduStepper } from './lib/stepper/edu-stepper';
export { EduStepList } from './lib/stepper/edu-step-list';
export { EduStep } from './lib/stepper/edu-step';
export { EduStepPanels } from './lib/stepper/edu-step-panels';
export { EduStepPanel } from './lib/stepper/edu-step-panel';
export type { EduStepValue } from './lib/stepper/edu-stepper.service';

// F2c — SelectButton, InputNumber, Password, Paginator (behavioral, ControlValueAccessor, no CDK).
export { EduSelectButton } from './lib/select-button/edu-select-button';

export { EduInputNumber } from './lib/input-number/edu-input-number';
export type { EduInputNumberInputEvent } from './lib/input-number/edu-input-number';

export { EduPassword } from './lib/password/edu-password';
export type { EduPasswordStrength } from './lib/password/edu-password';

export { EduPaginator } from './lib/paginator/edu-paginator';
export type { EduPaginatorPageEvent } from './lib/paginator/edu-paginator';

// F3a — Select, MultiSelect, AutoComplete, Popover (overlay anchored to trigger,
// reuses EduOverlayHandle with a `flexibleConnectedTo` position strategy).
export { EduSelect } from './lib/select/edu-select';
export type { EduSelectFilterEvent } from './lib/select/edu-select';

export { EduMultiSelect } from './lib/multi-select/edu-multi-select';
export type { EduMultiSelectDisplay } from './lib/multi-select/edu-multi-select';

export { EduAutoComplete } from './lib/autocomplete/edu-autocomplete';
export type { EduAutoCompleteCompleteEvent, EduAutoCompleteSelectEvent } from './lib/autocomplete/edu-autocomplete';

export { EduPopover } from './lib/popover/edu-popover';

// F3b — Table (semantic <table>, not CdkTable's column-def API — real usage projects a full
// <tr> per header/body/footer, which doesn't fit CdkTable's per-column cell model). Sort state
// via eduSortableColumn + EduTableService; paginator reuses edu-paginator as-is.
export { EduTable } from './lib/table/edu-table';
export type { EduTableSortEvent, EduTableSortOrder, EduTableLazyLoadEvent } from './lib/table/edu-table';

export { EduSortableColumn } from './lib/table/edu-sortable-column';

export { EduTemplate } from './lib/table/edu-template';

// F3c — DatePicker (popup CDK Overlay + inline, mismo componente de calendario interno,
// selectionMode single/range/multiple) y FileUpload (mode="basic" únicamente, sin evidencia
// de uso real del modo "advanced" de PrimeNG).
export { EduDatePicker } from './lib/datepicker/edu-datepicker';
export type { EduDatePickerSelectionMode, EduDatePickerHourFormat } from './lib/datepicker/edu-datepicker';

export { EduFileUpload } from './lib/file-upload/edu-file-upload';
export type { EduFileUploadSelectEvent } from './lib/file-upload/edu-file-upload';

// F4 — Toast + EduMessageService. providedIn: 'root' by default; consumers that need a local
// (non-global) toast scope it via `providers: [EduMessageService]` on their own component.
export { EduToast } from './lib/toast/edu-toast';
export type { EduToastPosition } from './lib/toast/edu-toast';

export { EduMessageService } from './lib/toast/edu-message.service';
export type { EduToastMessage, EduToastMessageOptions, EduToastSeverity } from './lib/toast/edu-message.service';

// F6 prep — IconField/InputIcon (gap real: único componente PrimeNG en uso en
// educa-web no cubierto por F1-F5). Posición izquierda/derecha por orden de
// DOM (:first-child/:last-child), no por input — ver nota en edu-icon-field.scss.
export { EduIconField } from './lib/icon-field/edu-icon-field';
export { EduInputIcon } from './lib/icon-field/edu-input-icon';
