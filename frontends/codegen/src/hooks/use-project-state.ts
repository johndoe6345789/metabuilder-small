import { useKV } from '@/hooks/use-kv'
import { 
  ProjectFile, 
  PrismaModel, 
  ComponentNode, 
  ComponentTree, 
  ThemeConfig,
  PlaywrightTest,
  StorybookStory,
  UnitTest,
  FlaskConfig,
  NextJsConfig,
  NpmSettings,
  Workflow,
  Lambda,
  FeatureToggles
} from '@/types/project'

const DEFAULT_FLASK_CONFIG: FlaskConfig = {
  blueprints: [],
  corsOrigins: ['http://localhost:3000'],
  enableSwagger: true,
  port: 5000,
  debug: true,
}

const DEFAULT_NEXTJS_CONFIG: NextJsConfig = {
  appName: 'my-nextjs-app',
  typescript: true,
  eslint: true,
  tailwind: true,
  srcDirectory: true,
  appRouter: true,
  importAlias: '@/*',
  turbopack: false,
  githubRepo: {
    owner: 'johndoe6345789',
    repo: 'low-code-react-app-b',
  },
}

const DEFAULT_NPM_SETTINGS: NpmSettings = {
  packages: [
    { id: '1', name: 'react', version: '^18.2.0', isDev: false },
    { id: '2', name: 'react-dom', version: '^18.2.0', isDev: false },
    { id: '3', name: 'next', version: '^14.0.0', isDev: false },
    { id: '4', name: '@mui/material', version: '^5.14.0', isDev: false },
    { id: '5', name: 'typescript', version: '^5.0.0', isDev: true },
    { id: '6', name: '@types/react', version: '^18.2.0', isDev: true },
  ],
  scripts: {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
    lint: 'next lint',
  },
  packageManager: 'npm',
}

const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  codeEditor: true,
  models: true,
  components: true,
  componentTrees: true,
  workflows: true,
  lambdas: true,
  styling: true,
  flaskApi: true,
  playwright: true,
  storybook: true,
  unitTests: true,
  errorRepair: true,
  documentation: true,
  sassStyles: true,
  faviconDesigner: true,
  ideaCloud: true,
  schemaEditor: true,
  dataBinding: true,
}

const DEFAULT_THEME: ThemeConfig = {
  variants: [
    {
      id: 'light',
      name: 'Light',
      colors: {
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        errorColor: '#f44336',
        warningColor: '#ff9800',
        successColor: '#4caf50',
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#000000',
        textSecondary: '#666666',
        border: '#e0e0e0',
        customColors: {},
      },
    },
    {
      id: 'dark',
      name: 'Dark',
      colors: {
        primaryColor: '#90caf9',
        secondaryColor: '#f48fb1',
        errorColor: '#f44336',
        warningColor: '#ffa726',
        successColor: '#66bb6a',
        background: '#121212',
        surface: '#1e1e1e',
        text: '#ffffff',
        textSecondary: '#b0b0b0',
        border: '#333333',
        customColors: {},
      },
    },
  ],
  activeVariantId: 'light',
  fontFamily: 'Roboto, Arial, sans-serif',
  fontSize: { small: 12, medium: 14, large: 20 },
  spacing: 8,
  borderRadius: 4,
}

const DEFAULT_FILES: ProjectFile[] = [
  {
    id: 'file-1',
    name: 'page.tsx',
    path: '/src/app/page.tsx',
    content: `'use client'\n\nimport { ThemeProvider } from '@mui/material/styles'\nimport CssBaseline from '@mui/material/CssBaseline'\nimport { theme } from '@/theme'\nimport { Box, Typography, Button } from '@mui/material'\n\nexport default function Home() {\n  return (\n    <ThemeProvider theme={theme}>\n      <CssBaseline />\n      <Box sx={{ p: 4 }}>\n        <Typography variant="h3" gutterBottom>\n          Welcome to Your App\n        </Typography>\n        <Button variant="contained" color="primary">\n          Get Started\n        </Button>\n      </Box>\n    </ThemeProvider>\n  )\n}`,
    language: 'typescript',
  },
  {
    id: 'file-2',
    name: 'layout.tsx',
    path: '/src/app/layout.tsx',
    content: `export const metadata = {\n  title: 'My Next.js App',\n  description: 'Generated with CodeForge',\n}\n\nexport default function RootLayout({\n  children,\n}: {\n  children: React.ReactNode\n}) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}`,
    language: 'typescript',
  },
  {
    id: 'file-3',
    name: 'globals.css',
    path: '/src/app/globals.css',
    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --foreground-rgb: 0, 0, 0;\n  --background-start-rgb: 214, 219, 220;\n  --background-end-rgb: 255, 255, 255;\n}\n\nbody {\n  color: rgb(var(--foreground-rgb));\n  background: linear-gradient(\n    to bottom,\n    transparent,\n    rgb(var(--background-end-rgb))\n  ) rgb(var(--background-start-rgb));\n}`,
    language: 'css',
  },
  {
    id: 'file-4',
    name: 'api.ts',
    path: '/src/lib/api.ts',
    content: `const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'\n\nexport async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {\n  const res = await fetch(\`\${API_BASE}\${endpoint}\`, {\n    headers: { 'Content-Type': 'application/json', ...options?.headers },\n    ...options,\n  })\n  if (!res.ok) throw new Error(\`API error: \${res.status}\`)\n  return res.json()\n}\n\nexport const api = {\n  users: {\n    list: () => fetchAPI<any[]>('/api/v1/default/core/user'),\n    get: (id: string) => fetchAPI<any>(\`/api/v1/default/core/user/\${id}\`),\n  },\n}`,
    language: 'typescript',
  },
]

const DEFAULT_MODELS: PrismaModel[] = [
  {
    id: 'model-1',
    name: 'User',
    fields: [
      { id: 'f-1', name: 'id', type: 'String', isRequired: true, isUnique: true, isArray: false, defaultValue: 'uuid()' },
      { id: 'f-2', name: 'email', type: 'String', isRequired: true, isUnique: true, isArray: false },
      { id: 'f-3', name: 'name', type: 'String', isRequired: false, isUnique: false, isArray: false },
      { id: 'f-4', name: 'role', type: 'String', isRequired: true, isUnique: false, isArray: false, defaultValue: "'user'" },
      { id: 'f-5', name: 'createdAt', type: 'DateTime', isRequired: true, isUnique: false, isArray: false, defaultValue: 'now()' },
    ],
  },
  {
    id: 'model-2',
    name: 'Post',
    fields: [
      { id: 'f-6', name: 'id', type: 'String', isRequired: true, isUnique: true, isArray: false, defaultValue: 'uuid()' },
      { id: 'f-7', name: 'title', type: 'String', isRequired: true, isUnique: false, isArray: false },
      { id: 'f-8', name: 'content', type: 'String', isRequired: false, isUnique: false, isArray: false },
      { id: 'f-9', name: 'published', type: 'Boolean', isRequired: true, isUnique: false, isArray: false, defaultValue: 'false' },
      { id: 'f-10', name: 'authorId', type: 'String', isRequired: true, isUnique: false, isArray: false, relation: 'User' },
    ],
  },
  {
    id: 'model-3',
    name: 'Session',
    fields: [
      { id: 'f-11', name: 'id', type: 'String', isRequired: true, isUnique: true, isArray: false, defaultValue: 'uuid()' },
      { id: 'f-12', name: 'userId', type: 'String', isRequired: true, isUnique: false, isArray: false, relation: 'User' },
      { id: 'f-13', name: 'token', type: 'String', isRequired: true, isUnique: true, isArray: false },
      { id: 'f-14', name: 'expiresAt', type: 'DateTime', isRequired: true, isUnique: false, isArray: false },
    ],
  },
]

const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'workflow-1',
    name: 'User Registration',
    description: 'Validates input, creates user, sends welcome email',
    nodes: [
      { id: 'n-1', type: 'trigger', name: 'Form Submit', position: { x: 100, y: 100 }, data: { label: 'Registration Form' }, config: { triggerType: 'event' } },
      { id: 'n-2', type: 'action', name: 'Validate', position: { x: 300, y: 100 }, data: { label: 'Validate Input' } },
      { id: 'n-3', type: 'database', name: 'Create User', position: { x: 500, y: 100 }, data: { label: 'Insert User' }, config: { databaseQuery: 'INSERT INTO users' } },
      { id: 'n-4', type: 'lambda', name: 'Send Email', position: { x: 700, y: 100 }, data: { label: 'Welcome Email' }, config: { lambdaCode: '// send email' } },
    ],
    connections: [
      { id: 'c-1', source: 'n-1', target: 'n-2' },
      { id: 'c-2', source: 'n-2', target: 'n-3' },
      { id: 'c-3', source: 'n-3', target: 'n-4' },
    ],
    isActive: true, status: 'success', lastRun: Date.now() - 3600000, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 3600000,
  },
]

const DEFAULT_COMPONENTS: ComponentNode[] = [
  { id: 'comp-1', type: 'Button', name: 'PrimaryButton', props: { variant: 'contained', color: 'primary' }, children: [] },
  { id: 'comp-2', type: 'Card', name: 'UserCard', props: { elevation: 2 }, children: [
    { id: 'comp-3', type: 'CardContent', name: 'CardBody', props: {}, children: [] },
  ] },
  { id: 'comp-4', type: 'TextField', name: 'SearchInput', props: { placeholder: 'Search...', variant: 'outlined', size: 'small' }, children: [] },
]

export function useProjectState() {
  const [files, setFiles] = useKV<ProjectFile[]>('project-files', DEFAULT_FILES)
  const [models, setModels] = useKV<PrismaModel[]>('project-models', DEFAULT_MODELS)
  const [components, setComponents] = useKV<ComponentNode[]>('project-components', DEFAULT_COMPONENTS)
  const [componentTrees, setComponentTrees] = useKV<ComponentTree[]>('project-component-trees', [
    {
      id: 'default-tree',
      name: 'Main App',
      description: 'Default component tree',
      rootNodes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ])
  const [workflows, setWorkflows] = useKV<Workflow[]>('project-workflows', DEFAULT_WORKFLOWS)
  const [lambdas, setLambdas] = useKV<Lambda[]>('project-lambdas', [])
  const [theme, setTheme] = useKV<ThemeConfig>('project-theme', DEFAULT_THEME)
  const [playwrightTests, setPlaywrightTests] = useKV<PlaywrightTest[]>('project-playwright-tests', [])
  const [storybookStories, setStorybookStories] = useKV<StorybookStory[]>('project-storybook-stories', [])
  const [unitTests, setUnitTests] = useKV<UnitTest[]>('project-unit-tests', [])
  const [flaskConfig, setFlaskConfig] = useKV<FlaskConfig>('project-flask-config', DEFAULT_FLASK_CONFIG)
  const [nextjsConfig, setNextjsConfig] = useKV<NextJsConfig>('project-nextjs-config', DEFAULT_NEXTJS_CONFIG)
  const [npmSettings, setNpmSettings] = useKV<NpmSettings>('project-npm-settings', DEFAULT_NPM_SETTINGS)
  const [featureToggles, setFeatureToggles] = useKV<FeatureToggles>('project-feature-toggles', DEFAULT_FEATURE_TOGGLES)

  const safeFiles = Array.isArray(files) ? files : []
  const safeModels = Array.isArray(models) ? models : []
  const safeComponents = Array.isArray(components) ? components : []
  const safeComponentTrees = Array.isArray(componentTrees) ? componentTrees : []
  const safeWorkflows = Array.isArray(workflows) ? workflows : []
  const safeLambdas = Array.isArray(lambdas) ? lambdas : []
  const safeTheme = (theme && theme.variants && Array.isArray(theme.variants) && theme.variants.length > 0) ? theme : DEFAULT_THEME
  const safePlaywrightTests = Array.isArray(playwrightTests) ? playwrightTests : []
  const safeStorybookStories = Array.isArray(storybookStories) ? storybookStories : []
  const safeUnitTests = Array.isArray(unitTests) ? unitTests : []
  const safeFlaskConfig = flaskConfig || DEFAULT_FLASK_CONFIG
  const safeNextjsConfig = nextjsConfig || DEFAULT_NEXTJS_CONFIG
  const safeNpmSettings = npmSettings || DEFAULT_NPM_SETTINGS
  const safeFeatureToggles = featureToggles || DEFAULT_FEATURE_TOGGLES
  
  return {
    files: safeFiles,
    setFiles,
    models: safeModels,
    setModels,
    components: safeComponents,
    setComponents,
    componentTrees: safeComponentTrees,
    setComponentTrees,
    workflows: safeWorkflows,
    setWorkflows,
    lambdas: safeLambdas,
    setLambdas,
    theme: safeTheme,
    setTheme,
    playwrightTests: safePlaywrightTests,
    setPlaywrightTests,
    storybookStories: safeStorybookStories,
    setStorybookStories,
    unitTests: safeUnitTests,
    setUnitTests,
    flaskConfig: safeFlaskConfig,
    setFlaskConfig,
    nextjsConfig: safeNextjsConfig,
    setNextjsConfig,
    npmSettings: safeNpmSettings,
    setNpmSettings,
    featureToggles: safeFeatureToggles,
    setFeatureToggles,
    defaults: {
      DEFAULT_FLASK_CONFIG,
      DEFAULT_NEXTJS_CONFIG,
      DEFAULT_NPM_SETTINGS,
      DEFAULT_FEATURE_TOGGLES,
      DEFAULT_THEME,
      DEFAULT_FILES,
    }
  }
}
