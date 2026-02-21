'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDBAL } from '@metabuilder/api-clients'
import { WelcomePage } from '@/components/WelcomePage'

interface PageConfig {
  path: string
  title: string
  component: string
  packageId: string
  requiresAuth: boolean
  isPublished: boolean
  level: number
}

export default function RootPage() {
  const router = useRouter()
  const dbal = useDBAL({ tenant: 'system', package: 'core' })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    dbal
      .list<{ data: PageConfig[] }>('PageConfig')
      .then((result) => {
        const homeRoute = result?.data?.find(
          (r) => r.path === '/' && r.isPublished === true
        )

        if (homeRoute && homeRoute.requiresAuth) {
          router.replace('/ui/login')
          return
        }

        // No auth required or no home route configured — show welcome
        setReady(true)
      })
      .catch(() => {
        setReady(true)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return null
  }

  return <WelcomePage />
}
