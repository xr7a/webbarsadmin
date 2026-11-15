import { useEffect, useState } from 'react'
import { loadRequestCost, loadTechnicalAnalytics } from '../model/api'
import { formatMetric, formatMilliseconds, summarizeTechnicalAnalytics } from '../model/technical-analytics'
import type { TechnicalAnalytics, TechnicalRange } from '../model/technical-analytics'
import styles from './home-page.module.css'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: TechnicalAnalytics; requestCost: number | null }

export function RequestAnalytics({ range }: { range: TechnicalRange }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadTechnicalAnalytics(range, controller.signal).then(async (data) => {
      const cost = await loadRequestCost(data, controller.signal).catch(() => null)
      if (!controller.signal.aborted) setState({ status: 'ready', data, requestCost: cost?.mean ?? null })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [range, attempt])

  if (state.status === 'loading') return <p className={styles.analyticsLoading} role="status">Загружаем аналитику…</p>
  if (state.status === 'error') return (
    <div className={styles.loadError} role="alert">
      <p>Не удалось загрузить аналитику. Попробуйте ещё раз.</p>
      <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button>
    </div>
  )

  const { data } = state
  const summary = summarizeTechnicalAnalytics(data)
  const responseTime = formatMilliseconds(data.response_time.mean_ms)
  const metrics = [
    { label: 'Токены на обращение', value: formatMetric(summary.tokensPerResponse), unit: 'токенов', description: 'Токены чата / число замеров ответа: ' + formatMetric(summary.samples) },
    { label: 'Среднее время ответа', value: responseTime, unit: 'с', description: '95% ответов — до ' + formatMilliseconds(data.response_time.p95_ms) + ' с' },
    { label: 'Стоимость обращения', value: formatMetric(state.requestCost, 2), unit: '₽' },
  ]

  return (
    <>
      <dl className={`${styles.overview} ${styles.requestOverview}`}>
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd><span className={styles.overviewValue}>{metric.value}<small>{metric.unit}</small></span>{metric.description && <span className={styles.metricHint}>{metric.description}</span>}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.detailGrid}>
        <section className={`${styles.detailSection} ${styles.responseSection}`} aria-labelledby="response-stages-heading">
          <h2 id="response-stages-heading">Состав времени ответа</h2>
          <p className={styles.sectionDescription}>Среднее время каждого этапа</p>
          <div className={styles.responseComposition}>
            <div className={styles.responsePlot}>
              <div className={styles.responseDonut} role="img" aria-label={'Среднее время ответа: ' + responseTime + ' с. Время этапов приведено рядом.'}>
                <svg viewBox="0 0 200 200" aria-hidden="true">
                  <circle cx="100" cy="100" r="83" fill="none" stroke="currentColor" strokeWidth="16" />
                  {summary.stages.map((stage) => stage.percent !== null && stage.percent > 0 && (
                    <circle key={stage.stage} cx="100" cy="100" r="83" fill="none" stroke={stage.color} strokeWidth="16" pathLength="100" strokeDasharray={stage.percent + ' ' + (100 - stage.percent)} strokeDashoffset={-stage.offset} transform="rotate(-90 100 100)" />
                  ))}
                </svg>
                <div className={styles.donutCaption} aria-hidden="true">
                  <span className={styles.donutValue}>{responseTime} <small>с</small></span>
                  <span className={styles.donutLabel}>Время ответа</span>
                </div>
              </div>
            </div>
            <dl className={styles.responseLegend}>
              {summary.stages.map((stage) => (
                <div key={stage.stage}>
                  <dt><span className={styles.legendDot} style={{ background: stage.color }} aria-hidden="true" />{stage.label}</dt>
                  <dd><span className={styles.stageDuration}>{formatMilliseconds(stage.meanMs)} <small>с</small></span><span className={styles.stageShare}>{formatMetric(stage.percent, 2)} %</span></dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={`${styles.detailSection} ${styles.tokenSection}`} aria-labelledby="token-usage-heading">
          <h2 id="token-usage-heading">Структура токенов</h2>
          <p className={styles.sectionDescription}>Всего за выбранный период</p>
          <dl className={styles.breakdown}>
            <div><dt>Входящие</dt><dd>{formatMetric(summary.input)}</dd></div>
            <div><dt>Исходящие</dt><dd>{formatMetric(summary.output)}</dd></div>
            <div className={styles.breakdownTotal}><dt>Всего</dt><dd>{formatMetric(summary.total)}</dd></div>
          </dl>
          <div className={styles.tokenBar} role="img" aria-label={'Входящие токены: ' + formatMetric(summary.input) + ', исходящие: ' + formatMetric(summary.output)}>
            {summary.total > 0 && <><span style={{ width: summary.input / summary.total * 100 + '%' }} /><span style={{ width: summary.output / summary.total * 100 + '%' }} /></>}
          </div>
          <p className={styles.footnote}>Все вызовы моделей в чате. Токены загрузки документов учитываются отдельно.</p>
        </section>
      </div>
    </>
  )
}
