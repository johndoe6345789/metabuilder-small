import { render, screen } from '@testing-library/react';
import SettingsPage from './page';

jest.mock('@/app/PageLayout', () => ({
  PageLayout: ({ children }: any) => <div data-testid="page-layout">{children}</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div data-testid="motion-div" {...props}>{children}</div>,
  },
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

jest.mock('@/components/demo/PersistenceSettings', () => ({
  PersistenceSettings: () => <div data-testid="persistence-settings">Persistence</div>,
}));

jest.mock('@/components/settings/SchemaHealthCard', () => ({
  SchemaHealthCard: () => <div data-testid="schema-health-card">Schema</div>,
}));

jest.mock('@/components/settings/BackendAutoConfigCard', () => ({
  BackendAutoConfigCard: () => <div data-testid="backend-auto-config">Backend</div>,
}));

jest.mock('@/components/settings/StorageBackendCard', () => ({
  StorageBackendCard: () => <div data-testid="storage-backend">Storage</div>,
}));

jest.mock('@/components/settings/DatabaseStatsCard', () => ({
  DatabaseStatsCard: () => <div data-testid="database-stats">Stats</div>,
}));

jest.mock('@/components/settings/StorageInfoCard', () => ({
  StorageInfoCard: () => <div data-testid="storage-info">Info</div>,
}));

jest.mock('@/components/settings/DatabaseActionsCard', () => ({
  DatabaseActionsCard: () => <div data-testid="database-actions">Actions</div>,
}));

jest.mock('@/components/settings/OpenAISettingsCard', () => ({
  OpenAISettingsCard: () => <div data-testid="openai-settings">OpenAI</div>,
}));

jest.mock('@/components/settings/ProfileSettingsCard', () => ({
  ProfileSettingsCard: () => <div data-testid="profile-settings">Profile</div>,
}));

const mockSettingsState = {
  stats: null,
  loading: false,
  storageBackend: 'indexeddb' as const,
  setStorageBackend: jest.fn(),
  envVarSet: false,
  schemaHealth: null,
  checkingSchema: false,
  handleExport: jest.fn(),
  handleImport: jest.fn(),
  handleClear: jest.fn(),
  handleSeed: jest.fn(),
  formatBytes: (bytes: number) => `${bytes} B`,
  handleSaveStorageConfig: jest.fn(),
  checkSchemaHealth: jest.fn(),
};

jest.mock('@/hooks/useSettingsState', () => ({
  useSettingsState: jest.fn(() => mockSettingsState),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders page layout', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('page-layout')).toBeInTheDocument();
  });

  test('renders Settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  test('renders tab navigation', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  test('renders tab buttons', () => {
    render(<SettingsPage />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });

  test('renders AI tab content by default', () => {
    render(<SettingsPage />);
    // Default tab is 'ai'
    expect(screen.getByTestId('openai-settings')).toBeInTheDocument();
  });

  test('renders motion div', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });

  test('component renders without crashing', () => {
    const { container } = render(<SettingsPage />);
    expect(container).toBeInTheDocument();
  });

  test('has proper page layout structure', () => {
    render(<SettingsPage />);
    const layout = screen.getByTestId('page-layout');
    expect(layout).toBeInTheDocument();
  });
});
