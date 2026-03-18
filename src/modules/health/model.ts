export const databaseReadyStates = {
  connected: 'connected',
  connecting: 'connecting',
  disconnecting: 'disconnecting',
  disconnected: 'disconnected',
  unknown: 'unknown',
} as const

export type DatabaseReadyState =
  (typeof databaseReadyStates)[keyof typeof databaseReadyStates]
