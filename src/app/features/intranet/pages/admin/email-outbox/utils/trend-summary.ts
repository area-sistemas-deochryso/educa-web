export interface TrendSummary {
	readonly avg7d: number;
	readonly max30d: number;
}

export function trendSummary(data: readonly number[]): TrendSummary {
	if (!data || data.length === 0) return { avg7d: 0, max30d: 0 };
	const last7 = data.slice(-7);
	return {
		avg7d: Math.round(last7.reduce((a, b) => a + b, 0) / last7.length),
		max30d: Math.max(...data),
	};
}
