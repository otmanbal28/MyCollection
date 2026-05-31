// =============================================================
//  Preload — pont sécurisé entre le renderer (Angular) et le
//  main process. Le renderer n'a JAMAIS accès direct à Node ni
//  à Prisma : il passe uniquement par window.api.* exposé ici.
// =============================================================
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Collections (lecture seule depuis l'UI)
  listCollections: () => ipcRenderer.invoke('collection:list'),

  // Items (CRUD)
  listItems: (payload?: any) => ipcRenderer.invoke('item:list', payload),
  getItem: (id: number) => ipcRenderer.invoke('item:get', id),
  createItem: (data: any) => ipcRenderer.invoke('item:create', data),
  updateItem: (data: any) => ipcRenderer.invoke('item:update', data),
  deleteItem: (id: number) => ipcRenderer.invoke('item:delete', id),
  deleteUsedItems: () => ipcRenderer.invoke('item:deleteUsed'),

  // Stats & historique
  getStats: () => ipcRenderer.invoke('stats:global'),
  listHistorique: () => ipcRenderer.invoke('historique:list'),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
