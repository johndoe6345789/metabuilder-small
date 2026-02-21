import { createPersistedStore } from '@metabuilder/redux-persist'
import snippetsReducer from './slices/snippetsSlice'
import namespacesReducer from './slices/namespacesSlice'
import uiReducer from './slices/uiSlice'

const { store, persistor } = createPersistedStore({
  reducers: {
    snippets: snippetsReducer,
    namespaces: namespacesReducer,
    ui: uiReducer,
  },
  persist: {
    key: 'pastebin',
    whitelist: ['snippets', 'namespaces', 'ui'],
    throttle: 100,
  },
  devTools: {
    name: 'CodeSnippet',
    trace: true,
    traceLimit: 25,
  },
})

export { store, persistor }

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
