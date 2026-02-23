import { useProjectSettingsActions } from '@/components/project-settings/useProjectSettingsActions'
import copy from '@/data/project-settings.json'
import { NextJsConfig, NpmSettings } from '@/types/project'

interface UseProjectSettingsViewArgs {
  nextjsConfig: NextJsConfig
  npmSettings: NpmSettings
  onNextjsConfigChange: (config: NextJsConfig | ((current: NextJsConfig) => NextJsConfig)) => void
  onNpmSettingsChange: (settings: NpmSettings | ((current: NpmSettings) => NpmSettings)) => void
}

export function useProjectSettingsView(args: UseProjectSettingsViewArgs) {
  const actions = useProjectSettingsActions({ onNpmSettingsChange: args.onNpmSettingsChange })

  return {
    ...args,
    ...actions,
    copy,
  }
}
