import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Snippet } from '@/lib/types'

export type AppLocale = 'en' | 'es'

interface UiState {
  dialogOpen: boolean
  viewerOpen: boolean
  editingSnippet: Snippet | null
  viewingSnippet: Snippet | null
  searchQuery: string
  locale: AppLocale
}

const initialState: UiState = {
  dialogOpen: false,
  viewerOpen: false,
  editingSnippet: null,
  viewingSnippet: null,
  searchQuery: '',
  locale: 'en',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openDialog: (state, action: PayloadAction<Snippet | null>) => {
      state.dialogOpen = true
      state.editingSnippet = action.payload
    },
    closeDialog: (state) => {
      state.dialogOpen = false
      state.editingSnippet = null
    },
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
  openDialog,
  closeDialog,
  openViewer,
  closeViewer,
  setSearchQuery,
  setLocale,
} = uiSlice.actions

export default uiSlice.reducer
