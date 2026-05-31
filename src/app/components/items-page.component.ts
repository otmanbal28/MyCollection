// =============================================================
//  ItemsPageComponent — page principale. Liste les items,
//  ouvre le formulaire de création / édition, gère la
//  suppression. Démontre : signals, computed, effect (bonus),
//  @for/@if, composition de composants enfants.
// =============================================================
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CollectionService } from '../services/collection.service';
import { ItemCardComponent } from './item-card.component';
import { ItemFormComponent } from './item-form.component';
import { Item } from '../models/models';

@Component({
  selector: 'app-items-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ItemCardComponent, ItemFormComponent],
  templateUrl: './items-page.component.html',
  styleUrl: './items-page.component.css',
})
export class ItemsPageComponent implements OnInit {
  private service = inject(CollectionService);

  readonly items = this.service.items;
  readonly chargement = this.service.chargement;
  readonly erreur = this.service.erreur;

  readonly formVisible = signal(false);
  readonly itemEnEdition = signal<Item | null>(null);
  readonly recherche = signal('');

  // computed — filtre les items selon la recherche.
  readonly itemsFiltres = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((i) => i.nom.toLowerCase().includes(q));
  });

  readonly aucunResultat = computed(
    () => !this.chargement() && this.itemsFiltres().length === 0
  );

  constructor() {
    // effect (bonus) — log à chaque changement du nombre d'items.
    effect(() => {
      console.log(`[effect] Items affichés : ${this.items().length}`);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.service.chargerTout();
  }

  ouvrirCreation(): void {
    this.itemEnEdition.set(null);
    this.formVisible.set(true);
  }

  ouvrirEdition(item: Item): void {
    this.itemEnEdition.set(item);
    this.formVisible.set(true);
  }

  fermerForm(): void {
    this.formVisible.set(false);
    this.itemEnEdition.set(null);
  }

  async onSupprimer(id: number): Promise<void> {
    await this.service.supprimerItem(id);
  }

  async supprimerUses(): Promise<void> {
    await this.service.supprimerItemsUses();
  }

  majRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }
}
