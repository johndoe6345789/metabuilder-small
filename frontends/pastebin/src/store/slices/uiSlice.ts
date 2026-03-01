import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Snippet } from '@/lib/types'

export type AppLocale = 'en' | 'es'

interface UiState {
  viewerOpen: boolean
  viewingSnippet: Snippet | null
  searchQuery: string
  locale: AppLocale
}

const initialState: UiState = {
  viewerOpen: false,
  viewingSnippet: null,
  searchQuery: '',
  locale: 'en',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openViewer: (state, action: PayloadAction<Snippet>) => {
      state.viewerOpen = true
      state.viewingSnippet = action.payload
    },
    closeViewer: (state) => {
      state.viewerOpen = false
      state.viewingSnippet = null
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setLocale: (state, action: PayloadAction<AppLocale>) => {
      state.locale = action.payload
    },
  },
})

export const {
  openViewer,
  closeViewer,
  setSearchQuery,
  setLocale,
} = uiSlice.actions

export default uiSlice.reducer
