import { request } from '@/shared/api/client'
import { toAnalyticsDocument } from './analytics'
import type { AnalyticsDocument, DocumentJob } from './analytics'
import type { TechnicalAnalytics, TechnicalRange } from './technical-analytics'

type DocumentPage = { items: DocumentJob[]; total: number }

export async function loadAnalyticsDocuments(signal: AbortSignal): Promise<AnalyticsDocument[]> {
  const documents: AnalyticsDocument[] = []
  let page = 1
  let result: DocumentPage
  do {
    result = await request<DocumentPage>('/rag/jobs?' + new URLSearchParams({ page: String(page), page_size: '100' }), { signal })
    documents.push(...result.items.map(toAnalyticsDocument))
    page += 1
  } while (result.items.length > 0 && documents.length < result.total)
  return documents
}

export function loadTechnicalAnalytics(range: TechnicalRange, signal: AbortSignal) {
  return request<TechnicalAnalytics>('/analytics/technical?' + new URLSearchParams({ range }), { signal })
}

export function loadRequestCost({ from_at, to_at }: Pick<TechnicalAnalytics, 'from_at' | 'to_at'>, signal: AbortSignal) {
  return request<{ mean: number | null }>('/analytics/request-cost?' + new URLSearchParams({ from_at, to_at }), { signal })
}
