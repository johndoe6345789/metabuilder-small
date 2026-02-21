import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {
  syncAllToFlask,
  fetchAllFromFlask,
  getFlaskStats,
  clearFlaskStorage
} from '@/store/middleware/flaskSync'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncedAt: number | null
  flaskConnected: boolean
  flaskStats: {
    totalKeys: number
    totalSizeBytes: number
  } | null
  error: string | null
}

const initialState: SyncState = {
  status: 'idle',
  lastSyncedAt: null,
  flaskConnected: false,
  flaskStats: null,
  error: null,
}

export const syncToFlaskBulk = createAsyncThunk(
  'sync/syncToFlaskBulk',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any
      const data: Record<string, any> = {}

      state.files.files.forEach((file: any) => {
        data[`files:${file.id}`] = file
      })

      state.models.models.forEach((model: any) => {
        data[`models:${model.id}`] = model
      })

      state.components.components.forEach((component: any) => {
        data[`components:${component.id}`] = component
      })

      state.workflows.workflows.forEach((workflow: any) => {
        data[`workflows:${workflow.id}`] = workflow
      })

      await syncAllToFlask(data)
      return Date.now()
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export interface SyncFromFlaskPayload {
  timestamp: number
  data: {
    files: any[]
    models: any[]
    components: any[]
    workflows: any[]
  }
}

export const syncFromFlaskBulk = createAsyncThunk(
  'sync/syncFromFlaskBulk',
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchAllFromFlask()
      const organized: SyncFromFlaskPayload['data'] = {
        files: [],
        models: [],
        components: [],
        workflows: [],
      }

      for (const [key, value] of Object.entries(data)) {
        if (typeof key !== 'string') continue

        const parts = key.split(':')
        if (parts.length !== 2) continue

        const [storeName, id] = parts
        if (!storeName || !id) continue

        if (storeName in organized) {
          organized[storeName as keyof typeof organized].push(value)
        }
      }

      return { timestamp: Date.now(), data: organized } as SyncFromFlaskPayload
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const checkFlaskConnection = createAsyncThunk(
  'sync/checkConnection',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await getFlaskStats()
      return {
        connected: true,
        stats: {
          totalKeys: stats.total_keys,
          totalSizeBytes: stats.total_size_bytes,
        },
      }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const clearFlask = createAsyncThunk(
  'sync/clearFlask',
  async (_, { rejectWithValue }) => {
    try {
      await clearFlaskStorage()
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    resetSyncStatus: (state) => {
      state.status = 'idle'
      state.error = null
    },
    setFlaskConnected: (state, action: PayloadAction<boolean>) => {
      state.flaskConnected = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncToFlaskBulk.pending, (state) => {
        state.status = 'syncing'
        state.error = null
      })
      .addCase(syncToFlaskBulk.fulfilled, (state, action) => {
        state.status = 'success'
        state.lastSyncedAt = action.payload
      })
      .addCase(syncToFlaskBulk.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload as string
      })
      .addCase(syncFromFlaskBulk.pending, (state) => {
        state.status = 'syncing'
        state.error = null
      })
      .addCase(syncFromFlaskBulk.fulfilled, (state, action) => {
        state.status = 'success'
        state.lastSyncedAt = action.payload.timestamp
      })
      .addCase(syncFromFlaskBulk.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload as string
      })
      .addCase(checkFlaskConnection.fulfilled, (state, action) => {
        state.flaskConnected = action.payload.connected
        state.flaskStats = action.payload.stats
      })
      .addCase(checkFlaskConnection.rejected, (state) => {
        state.flaskConnected = false
        state.flaskStats = null
      })
      .addCase(clearFlask.fulfilled, (state) => {
        state.flaskStats = {
          totalKeys: 0,
          totalSizeBytes: 0,
        }
      })
  },
})

export const { resetSyncStatus, setFlaskConnected } = syncSlice.actions
export default syncSlice.reducer
