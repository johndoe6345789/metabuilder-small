import { motion } from 'framer-motion'
import styles from './markdown-renderer.module.scss'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={styles.wrapper}
      data-testid="markdown-renderer"
      role="region"
      aria-label="Error analysis content"
    >
      <div className={styles.card}>
        {content.split('\n').map((line, idx) => {
          if (line.startsWith('###')) {
            return (
              <h3 key={idx} className={styles.h3}>
                {line.replace('###', '').trim()}
              </h3>
            )
          }
          if (line.startsWith('##')) {
            return (
              <h2 key={idx} className={styles.h2}>
                {line.replace('##', '').trim()}
              </h2>
            )
          }
          if (line.match(/^\d+\./)) {
            return (
              <div key={idx} className={styles.orderedItem}>
                {line}
              </div>
            )
          }
          if (line.startsWith('-')) {
            return (
              <div key={idx} className={styles.listItem}>
                {line}
              </div>
            )
          }
          if (line.trim()) {
            return (
              <p key={idx} className={styles.paragraph}>
                {line}
              </p>
            )
          }
          return null
        })}
      </div>
    </motion.div>
  )
}
