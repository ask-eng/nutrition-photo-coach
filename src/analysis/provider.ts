import type { FoodItem } from '../domain/types.ts';
export interface AnalysisResult { items: FoodItem[]; source: 'mock'; }
/** Future authorized AI adapters should call a server, never hold a browser API key. */
export interface AnalysisProvider {
  readonly name: string;
  analyze(photo: Blob, signal?: AbortSignal): Promise<AnalysisResult>;
}
