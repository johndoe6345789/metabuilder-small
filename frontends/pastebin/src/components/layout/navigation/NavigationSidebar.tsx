'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from '@phosphor-icons/react'
import { navigationItems } from './navigation-items'
import { useNavigation } from './useNavigation'
import styles from './NavigationSidebar.module.scss'

export function NavigationSidebar() {
  const { menuOpen, setMenuOpen } = useNavigation()
  const pathname = usePathname()

  return (
    <AnimatePresence>
      {menuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={styles.scrim}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
            data-testid="navigation-sidebar-overlay"
          />

          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.7 }}
            className={styles.drawer}
            data-testid="navigation-sidebar"
            id="navigation-sidebar"
            role="navigation"
            aria-label="Main navigation"
          >
            <div className={styles.header}>
              <span className={styles.title}>CodeSnippet</span>
              <button
                className={styles.closeBtn}
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                data-testid="navigation-sidebar-close-btn"
              >
                <X weight="bold" size={16} aria-hidden="true" />
              </button>
            </div>

            <nav className={styles.nav} data-testid="navigation-items">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                    data-testid={`nav-link-${item.path.replace(/\//g, '-')}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon weight={isActive ? 'fill' : 'regular'} size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
