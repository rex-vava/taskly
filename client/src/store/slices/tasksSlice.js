import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (params = {}) => {
  const { data } = await api.get('/tasks', { params });
  return data;
});

export const createTask = createAsyncThunk('tasks/create', async (taskData) => {
  const { data } = await api.post('/tasks', taskData);
  return data;
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, ...updates }) => {
  const { data } = await api.patch(`/tasks/${id}`, updates);
  return data;
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id) => {
  await api.delete(`/tasks/${id}`);
  return id;
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], loading: false, error: null },
  reducers: {
    taskCreated(state, action) {
      const exists = state.items.find((t) => t.id === action.payload.id);
      if (!exists) state.items.unshift(action.payload);
    },
    taskUpdated(state, action) {
      const idx = state.items.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
    },
    taskDeleted(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      });
  },
});

export const { taskCreated, taskUpdated, taskDeleted } = tasksSlice.actions;
export default tasksSlice.reducer;
