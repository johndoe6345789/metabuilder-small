'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Box, IconButton, Typography } from '@metabuilder/fakemui'
import { useUI, useResponsiveSidebar } from '@metabuilder/hooks'
import styles from '@metabuilder/scss/atoms/layout.module.scss'
import navData from '@/data/navigation.json'
import {
  MetabuilderWidgetProjectManager,
  MetabuilderWidgetSearchInput,
} from '@/lib/json-ui/json-components'
import { Toaster } from '@/components/ui/sonner'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { theme, sidebarOpen, setSidebar, toggleTheme } = useUI()
  const { isMobile } = useResponsiveSidebar(sidebarOpen, setSidebar)
  const pathname = usePathname()
  const router = useRouter()

  const handleNavigate = (page: string) => {
    const routeMap: Record<string, string> = {
      dashboard: '/codegen',
      code: '/codegen/code',
      models: '/codegen/models',
      components: '/codegen/components',
      'component-trees': '/codegen/component-trees',
      workflows: '/codegen/workflows',
      lambdas: '/codegen/lambdas',
      database: '/codegen/database',
    }
    router.push(routeMap[page] || `/codegen/${page}`)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      <Box className={styles.sidebarHeader} data-testid="sidebar-header">
        <Typography variant="subtitle1" className={styles.sidebarTitle}>Navigation</Typography>
      </Box>
      <nav className={styles.sidebarContent} aria-label="Main navigation" data-testid="main-nav">
        {navData.sections.map((section) => (
          <div key={section.title} className={styles.navSection} role="group" aria-label={section.title}>
            <h3 className={styles.navSectionTitle} id={`nav-section-${section.title.toLowerCase()}`}>
              {section.title}
            </h3>
            <ul className={styles.navList} aria-labelledby={`nav-section-${section.title.toLowerCase()}`}>
              {section.items.map((item) => (
                <li key={item.href} className={styles.navItem}>
                  <Link
                    href={item.href as any}
                    className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    data-testid={`nav-link-${item.href.replace(/^\//, '') || 'home'}`}
                  >
                    <span className={`${styles.navIcon} material-symbols-outlined`} aria-hidden="true">{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )

  return (
    <div className={styles.layout} data-testid="app-layout">
      {/* Header */}
      <Box component="header" className={styles.appBar} role="banner" data-testid="app-header">
        <Box className={styles.appBarLeft}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setSidebar(!sidebarOpen)}
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
            data-testid="toggle-sidebar"
          >
            <span className="material-symbols-outlined" aria-hidden="true">menu</span>
          </IconButton>
          <Box className={styles.appBarBrand} data-testid="app-brand">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ color: 'var(--mat-sys-primary)', fontSize: 28 }}>code</span>
            <Typography variant="h6" component="h1" className={styles.appBarTitle}>
              CodeForge
            </Typography>
          </Box>
        </Box>
        <Box className={styles.appBarActions} data-testid="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MetabuilderWidgetProjectManager />
          <MetabuilderWidgetSearchInput
            onNavigate={handleNavigate}
          />
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            data-testid="toggle-theme"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </IconButton>
        </Box>
      </Box>

      {/* Content area */}
      <div className={styles.content} data-testid="app-content">
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            className={styles.drawerBackdrop}
            onClick={() => setSidebar(false)}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />
        )}

        {/* Sidebar */}
        {isMobile ? (
          <aside
            id="sidebar"
            className={`${styles.drawerMobile} ${styles.sidebar} ${sidebarOpen ? styles.drawerMobileOpen : ''}`}
            aria-label="Navigation sidebar"
            aria-hidden={!sidebarOpen}
            data-testid="sidebar-mobile"
          >
            {sidebarContent}
          </aside>
        ) : (
          <aside
            id="sidebar"
            className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarHidden : ''}`}
            aria-label="Navigation sidebar"
            data-testid="sidebar"
          >
            {sidebarContent}
          </aside>
        )}

        {/* Main content */}
        <main className={styles.main} role="main" data-testid="main-content">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
