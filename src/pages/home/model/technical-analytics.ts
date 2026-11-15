export const technicalRanges = [
  { value: '1h', label: 'За час' },
  { value: '24h', label: 'За сутки' },
  { value: '7d', label: 'За 7 дней' },
] as const

export type TechnicalRange = (typeof technicalRanges)[number]['value']
type Stage = 'queue' | 'preparation' | 'delivery'
type WorkloadTokens = {
  input: number
  output: number
  by_model: { model: string; input: number; output: number }[]
}
type DeliveryOutcomes = { sent: number; failed: number; unknown: number }

export type TechnicalAnalytics = {
  range: TechnicalRange
  from_at: string
  to_at: string
  tokens: { chat: WorkloadTokens; document_import: WorkloadTokens }
  response_time: { sample_count: number; mean_ms: number | null; p95_ms: number | null }
  stages: { stage: Stage; mean_ms: number | null }[]
  agent_breakdown: { kind: 'model' | 'tool' | 'rag'; name: string; mean_ms: number }[]
  delivery: { answer: DeliveryOutcomes; fallback: DeliveryOutcomes; service: DeliveryOutcomes }
}

const stageDefinitions = [
  { stage: 'queue', label: 'Ожидание в очереди', color: '#98adb7' },
  { stage: 'preparation', label: 'Подготовка ответа', color: '#21343c' },
  { stage: 'delivery', label: 'Отправка ответа', color: '#64838c' },
] as const

export function summarizeTechnicalAnalytics(data: TechnicalAnalytics) {
  const input = data.tokens.chat.input
  const output = data.tokens.chat.output
  const total = input + output
  const samples = data.response_time.sample_count
  const measuredStages = stageDefinitions.map((definition) => {
    const duration = data.stages.find((item) => item.stage === definition.stage)?.mean_ms
    return { ...definition, meanMs: typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 ? duration : null }
  })
  const stagesComplete = measuredStages.every((stage) => stage.meanMs !== null)
  const stageTotal = measuredStages.reduce((sum, stage) => sum + (stage.meanMs ?? 0), 0)
  let offset = 0
  const stages = measuredStages.map((stage) => {
    const percent = stagesComplete && stageTotal > 0 ? (stage.meanMs ?? 0) / stageTotal * 100 : null
    const result = { ...stage, percent, offset }
    offset += percent ?? 0
    return result
  })
  return { input, output, total, samples, tokensPerResponse: samples > 0 ? total / samples : null, stages }
}

export function formatMetric(value: number | null | undefined, maximumFractionDigits = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value)
    : '—'
}

export function formatMilliseconds(value: number | null | undefined) {
  return formatMetric(typeof value === 'number' ? value / 1000 : null, value !== null && value !== undefined && value < 1000 ? 3 : 2)
}
