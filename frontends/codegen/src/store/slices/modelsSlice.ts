import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { syncToFlask, fetchFromFlask } from '@/store/middleware/flaskSync'

export interface Model {
  id: string
  name: string
  fields: ModelField[]
  updatedAt: number
}

export interface ModelField {
  id: string
  name: string
  type: string
  required: boolean
  defaultValue?: any
}

interface ModelsState {
  models: Model[]
  activeModelId: string | null
  loading: boolean
  error: string | null
}

const initialState: ModelsState = {
  models: [],
  activeModelId: null,
  loading: false,
  error: null,
}

export const saveModel = createAsyncThunk(
  'models/saveModel',
  async (model: Model) => {
    await syncToFlask('models', model.id, model)
    return model
  }
)

export const deleteModel = createAsyncThunk(
  'models/deleteModel',
  async (modelId: string) => {
    await syncToFlask('models', modelId, null, 'delete')
    return modelId
  }
)

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    setActiveModel: (state, action: PayloadAction<string>) => {
      state.activeModelId = action.payload
    },
    clearActiveModel: (state) => {
      state.activeModelId = null
    },
    addModel: (state, action: PayloadAction<Model>) => {
      state.models.push(action.payload)
    },
    updateModel: (state, action: PayloadAction<Model>) => {
      const index = state.models.findIndex(m => m.id === action.payload.id)
      if (index !== -1) {
        state.models[index] = action.payload
      }
    },
    removeModel: (state, action: PayloadAction<string>) => {
      state.models = state.models.filter(m => m.id !== action.payload)
      if (state.activeModelId === action.payload) {
        state.activeModelId = null
      }
    },
    setModels: (state, action: PayloadAction<Model[]>) => {
      state.models = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveModel.fulfilled, (state, action) => {
        const index = state.models.findIndex(m => m.id === action.payload.id)
        if (index !== -1) {
          state.models[index] = action.payload
        } else {
          state.models.push(action.payload)
        }
      })
      .addCase(deleteModel.fulfilled, (state, action) => {
        state.models = state.models.filter(m => m.id !== action.payload)
        if (state.activeModelId === action.payload) {
          state.activeModelId = null
        }
      })
      .addMatcher(
        (action) => action.type === 'sync/syncFromFlaskBulk/fulfilled',
        (state, action: any) => {
          if (action.payload?.data?.models) {
            state.models = action.payload.data.models
          }
        }
      )
  },
})

export const { setActiveModel, clearActiveModel, addModel, updateModel, removeModel, setModels } = modelsSlice.actions
export default modelsSlice.reducer
