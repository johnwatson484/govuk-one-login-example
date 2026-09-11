import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi'
import type { ValidationError } from 'joi'

interface ErrorSummaryItem {
  text: string
  href: string
}

interface ViewErrors {
  errorList: ErrorSummaryItem[]
  fields: Record<string, { text: string }>
}

function buildViewErrors (err: unknown): ViewErrors {
  const details = (err as ValidationError | undefined)?.details ?? []
  const errorList: ErrorSummaryItem[] = []
  const fields: Record<string, { text: string }> = {}

  for (const detail of details) {
    const key = String(detail.path[0] ?? 'form')

    // The design system shows one message per field, the first one wins.
    if (fields[key] !== undefined) {
      continue
    }

    fields[key] = { text: detail.message }
    errorList.push({ text: detail.message, href: `#${key}` })
  }

  return { errorList, fields }
}

type ExtraContext = (request: Request) => Promise<Record<string, unknown>> | Record<string, unknown>

function renderValidationErrors (view: string, extraContext?: ExtraContext): Lifecycle.Method {
  return async (request: Request, h: ResponseToolkit, err?: Error) => {
    const extra = extraContext === undefined ? {} : await extraContext(request)

    return h
      .view(view, { ...extra, errors: buildViewErrors(err), values: request.payload })
      .code(400)
      .takeover()
  }
}

export { buildViewErrors, renderValidationErrors }
export type { ViewErrors }
