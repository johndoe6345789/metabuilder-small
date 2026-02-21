import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface KVState {
  data: Record<string, unknown>
}

const initialState: KVState = {
  data: {},
}

const kvSlice = createSlice({
  name: 'kv',
  initialState,
  reducers: {
    setKV: (state, action: PayloadAction<{ key: string; value: unknown }>) => {
      state.data[action.payload.key] = action.payload.value
    },
    deleteKV: (state, action: PayloadAction<string>) => {
      delete state.data[action.payload]
    },
  },
})

export const { setKV, deleteKV } = kvSlice.actions
export default kvSlice.reducer
