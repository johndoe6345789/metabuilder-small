import { useKV } from '../use-kv'
import { PageConfig, PageConfigSchema } from '@/config/page-schema'
import defaultPagesData from '@/config/default-pages.json'

const defaultPages = defaultPagesData as { pages: PageConfig[] }

export function usePageConfig(pageId: string) {
  const defaultPage = defaultPages.pages.find((p) => p.id === pageId)

  const [pageConfig, setPageConfig] = useKV<PageConfig | null>(
    `page-config:${pageId}`,
    defaultPage || null,
  )

  return {
    pageConfig: pageConfig || defaultPage || null,
    setPageConfig,
  }
}

export function usePageRegistry() {
  const [pages, setPages] = useKV<PageConfig[]>(
    'page-registry',
    defaultPages.pages,
  )

  return {
    pages: pages || [],
    setPages,
    getPage: (id: string) => (pages || []).find((p) => p.id === id),
  }
}
