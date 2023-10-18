// DOCUMENTED
import { configureStore, ThunkAction, Action, Dispatch } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query/react'

import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from 'redux'

import { spellApi } from './api/spells'
import { rootApi } from './api/api'
import { agentApi } from './api/agents'
import tabReducer from './tabs'
import localStateReducer from './localState'
import preferencesReducer from './preferences'
import globalConfigReducer from './globalConfig'
import tabLayoutReducer from './tabLayoutState'
import statusBarReducer from './statusBarState'
import rootFeathers, { configureFeathersStore } from './feathers/root'
import { feathersEventMiddleware } from '@magickml/feathersRedux'

// import { AppConfig } from '@magickml/client-core'

/**
 * Combine all reducers into the root reducer.
 */
const rootReducer = combineReducers({
  [rootApi.reducerPath]: rootApi.reducer,
  [rootFeathers.rootReducerPath]: rootFeathers.reducer,
  tabLayout: tabLayoutReducer,
  globalConfig: globalConfigReducer,
  tabs: tabReducer,
  preferences: preferencesReducer,
  localState: localStateReducer,
  statusBar: statusBarReducer,
})

// Store instance placeholder
let _store: any = null

/**
 * Create a new store with optional configuration.
 * @param config - Optional configuration for the store.
 * @returns The created store.
 */
export const createStore = (config: any) => {
  if (_store) return _store

  const persistConfig = {
    key: config.projectId,
    version: 1,
    storage,
    blacklist: [
      spellApi.reducerPath,
      rootFeathers.rootReducerPath,
      'globalConfig',
      'statusBar',
    ],
  }

  const store = configureFeathersStore({
    reducer: persistReducer(persistConfig, rootReducer),
    preloadedState: {
      globalConfig: config,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: false,
      })
        .concat(rootApi.middleware)
        .concat(feathersEventMiddleware),
  })

  setupListeners(store.dispatch)
  persistStore(store)

  _store = store

  return store
}

// Export types for the application's Redux store
export type AppDispatch = Dispatch
export type RootState = ReturnType<typeof rootReducer>
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>
