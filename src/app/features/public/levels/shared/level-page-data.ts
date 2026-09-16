// #region Implementation
export interface LevelPageBlock {
	textBlockClass: string;
	heading: string;
	body: string;
	imageFirst: boolean;
}

export interface LevelPageData {
	level: 'inicial' | 'primaria' | 'secundaria';
	title: string;
	breadcrumbLabel: string;
	blocks: [LevelPageBlock, LevelPageBlock, LevelPageBlock];
}
// #endregion
