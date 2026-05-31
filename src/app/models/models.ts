// =============================================================
//  Modèles — interfaces TypeScript reflétant le schéma Prisma.
//  Typage strict des données échangées avec le main process.
// =============================================================

export type EtatUsure = 'NEUF' | 'USE';

export interface Categorie {
  id: number;
  nom: string;
  description: string | null;
}

export interface Localisation {
  id: number;
  nom: string;
  piece: string | null;
}

export interface Tag {
  id: number;
  nom: string;
}

export interface Collection {
  id: number;
  nom: string;
  description: string | null;
  categorieId: number;
  categorie?: Categorie;
  _count?: { items: number };
}

export interface ItemTag {
  itemId: number;
  tagId: number;
  tag: Tag;
}

export interface Item {
  id: number;
  nom: string;
  nombre: number;
  usure: EtatUsure;
  description: string | null;
  collectionId: number;
  localisationId: number | null;
  collection?: Collection;
  localisation?: Localisation | null;
  tags?: ItemTag[];
}

export interface Stats {
  totalItems: number;
  totalCollections: number;
  sommeNombre: number;
  parUsure: { usure: EtatUsure; count: number }[];
}

export interface HistoriqueAction {
  id: number;
  action: string;
  details: string | null;
  creeLe: string;
}

// Réponse uniforme renvoyée par chaque handler IPC.
export interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// Payload pour créer / modifier un item.
// La collection est désignée par son NOM (créée à la volée côté backend).
export interface ItemPayload {
  id?: number;
  nom: string;
  collectionNom: string;
  nombre: number;
  usure: EtatUsure;
  description?: string;
}

// --- Typage de l'API exposée par le preload (window.api) -----
export interface PreloadApi {
  listCollections(): Promise<IpcResponse<Collection[]>>;

  listItems(payload?: { collectionId?: number }): Promise<IpcResponse<Item[]>>;
  getItem(id: number): Promise<IpcResponse<Item>>;
  createItem(data: ItemPayload): Promise<IpcResponse<Item>>;
  updateItem(data: ItemPayload): Promise<IpcResponse<Item>>;
  deleteItem(id: number): Promise<IpcResponse<{ id: number }>>;
  deleteUsedItems(): Promise<IpcResponse<unknown>>;

  getStats(): Promise<IpcResponse<Stats>>;
  listHistorique(): Promise<IpcResponse<HistoriqueAction[]>>;
}

declare global {
  interface Window {
    api: PreloadApi;
  }
}
