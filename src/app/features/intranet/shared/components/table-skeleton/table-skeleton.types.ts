// #region Types
export type SkeletonCellType = 'text' | 'text-subtitle' | 'avatar-text' | 'badge' | 'actions';

export interface SkeletonColumnDef {
	width: string;
	cellType: SkeletonCellType;
	headerWidth?: string;
}
// #endregion
