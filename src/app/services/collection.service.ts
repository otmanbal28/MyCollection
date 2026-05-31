// =============================================================
//  CollectionService — service singleton (providedIn: 'root').
//  Centralise TOUTE la logique métier et l'état applicatif via
//  des signals. Les composants ne parlent jamais directement à
//  window.api : ils passent par ce service (séparation des
//  responsabilités exigée).
// =============================================================
import { Injectable, signal, computed } from '@angular/core';
import {
  Collection,
  Item,
  ItemPayload,
  Stats,
  HistoriqueAction,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  // --- État réactif (signals) ---
  readonly items = signal<Item[]>([]);
  readonly collections = signal<Collection[]>([]);
  readonly stats = signal<Stats | null>(null);
  readonly historique = signal<HistoriqueAction[]>([]);

  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);

  // --- Signaux dérivés (computed) ---
  readonly nombreItems = computed(() => this.items().length);
  readonly itemsUses = computed(() =>
    this.items().filter((i) => i.usure === 'USE').length
  );

  // --- Helper : déballe une réponse IPC ou lève l'erreur ---
  private async unwrap<T>(promise: Promise<{ ok: boolean; data?: T; error?: string }>): Promise<T> {
    const res = await promise;
    if (!res.ok) {
      this.erreur.set(res.error ?? 'Erreur inconnue');
      throw new Error(res.error);
    }
    return res.data as T;
  }

  // --- Chargements ---
  async chargerTout(): Promise<void> {
    this.chargement.set(true);
    this.erreur.set(null);
    try {
      const [items, collections, stats] = await Promise.all([
        this.unwrap(window.api.listItems()),
        this.unwrap(window.api.listCollections()),
        this.unwrap(window.api.getStats()),
      ]);
      this.items.set(items);
      this.collections.set(collections);
      this.stats.set(stats);
    } catch {
      // erreur déjà stockée dans this.erreur
    } finally {
      this.chargement.set(false);
    }
  }

  async rafraichirItems(): Promise<void> {
    const items = await this.unwrap(window.api.listItems());
    this.items.set(items);
    this.collections.set(await this.unwrap(window.api.listCollections()));
    this.stats.set(await this.unwrap(window.api.getStats()));
  }

  // --- CRUD items ---
  async creerItem(payload: ItemPayload): Promise<void> {
    await this.unwrap(window.api.createItem(payload));
    await this.rafraichirItems();
  }

  async modifierItem(payload: ItemPayload): Promise<void> {
    await this.unwrap(window.api.updateItem(payload));
    await this.rafraichirItems();
  }

  async supprimerItem(id: number): Promise<void> {
    await this.unwrap(window.api.deleteItem(id));
    await this.rafraichirItems();
  }

  async supprimerItemsUses(): Promise<void> {
    await this.unwrap(window.api.deleteUsedItems());
    await this.rafraichirItems();
  }

  getItem(id: number): Promise<Item> {
    return this.unwrap(window.api.getItem(id));
  }

  async chargerHistorique(): Promise<void> {
    this.historique.set(await this.unwrap(window.api.listHistorique()));
  }
}
