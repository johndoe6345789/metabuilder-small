import { createPersistedStore } from '@metabuilder/redux-persist'
import { type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import snippetsReducer from './slices/snippetsSlice'
import namespacesReducer from './slices/namespacesSlice'
import uiReducer from './slices/uiSlice'
import authReducer from './slices/authSlice'
import commentsReducer from './slices/commentsSlice'
import revisionsReducer from './slices/revisionsSlice'
import shareReducer from './slices/shareSlice'
import profilesReducer from './slices/profilesSlice'
import { setAuthToken } from '@/lib/authToken'

const { store, persistor } = createPersistedStore({
  reducers: {
    snippets: snippetsReducer,
    namespaces: namespacesReducer,
    ui: uiReducer,
    auth: authReducer,
    comments: commentsReducer,
    revisions: revisionsReducer,
    share: shareReducer,
    profiles: profilesReducer,
  },
  persist: {
    key: 'pastebin',
    whitelist: ['snippets', 'namespaces', 'ui', 'auth', 'comments', 'revisions', 'share', 'profiles'],
    throttle: 100,
  },
  devTools: {
    name: 'CodeSnippet',
    trace: true,
    traceLimit: 25,
  },
})

// Keep the token bridge in sync with Redux auth state.
// store.subscribe fires on REHYDRATE too, so this handles page-reload token restoration.
store.subscribe(() => setAuthToken(store.getState().auth.token))

export { store, persistor }

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>
