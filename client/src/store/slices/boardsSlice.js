import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchBoards = createAsyncThunk('boards/fetchAll', async () => {
  const { data } = await api.get('/boards');
  return data;
});

export const fetchBoard = createAsyncThunk('boards/fetchOne', async (id) => {
  const { data } = await api.get(`/boards/${id}`);
  return data;
});

export const createBoard = createAsyncThunk('boards/create', async (boardData) => {
  const { data } = await api.post('/boards', boardData);
  return data;
});

const boardsSlice = createSlice({
  name: 'boards',
  initialState: {
    items: [],
    current: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentBoard(state) {
      state.current = null;
    },
    updateBoardTasks(state, action) {
      if (state.current) {
        const idx = state.current.tasks?.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.current.tasks[idx] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchBoard.pending, (state) => { state.loading = true; })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.current = action.payload;
        state.loading = false;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { clearCurrentBoard, updateBoardTasks } = boardsSlice.actions;
export default boardsSlice.reducer;
