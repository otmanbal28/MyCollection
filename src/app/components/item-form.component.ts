// =============================================================
//  ItemFormComponent — formulaire de création / édition d'item.
//  Démontre : composant standalone, ReactiveFormsModule, input(),
//  output(), signals, @for/@if.
//
//  Champs demandés : nom de la collection, nombre, usure (oui/non),
//  description (facultative). La collection est créée à la volée
//  côté backend (find-or-create) à partir du nom saisi.
// =============================================================
import { Component, inject, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CollectionService } from '../services/collection.service';
import { Item, ItemPayload } from '../models/models';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './item-form.component.html',
  styleUrl: './item-form.component.css',
})
export class ItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CollectionService);

  // input() — un item à éditer (sinon mode création).
  itemAEditer = input<Item | null>(null);

  // output() — émis quand l'enregistrement réussit ou qu'on annule.
  enregistre = output<void>();
  annule = output<void>();

  readonly enCours = signal(false);

  // Formulaire réactif. usee : true = usé (oui), false = neuf (non).
  form = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(1)]],
    collectionNom: ['', [Validators.required, Validators.minLength(1)]],
    nombre: [1, [Validators.required, Validators.min(1)]],
    usee: [false], // boutons oui / non
    description: [''], // facultatif
  });

  ngOnInit(): void {
    const item = this.itemAEditer();
    if (item) {
      this.form.patchValue({
        nom: item.nom,
        collectionNom: item.collection?.nom ?? '',
        nombre: item.nombre,
        usee: item.usure === 'USE',
        description: item.description ?? '',
      });
    }
  }

  // Bouton oui / non pour l'usure.
  setUsure(usee: boolean): void {
    this.form.patchValue({ usee });
  }

  async soumettre(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enCours.set(true);
    const v = this.form.getRawValue();
    const payload: ItemPayload = {
      nom: v.nom!,
      collectionNom: v.collectionNom!,
      nombre: v.nombre!,
      usure: v.usee ? 'USE' : 'NEUF',
      description: v.description || undefined,
    };

    try {
      const item = this.itemAEditer();
      if (item) {
        await this.service.modifierItem({ ...payload, id: item.id });
      } else {
        await this.service.creerItem(payload);
      }
      this.enregistre.emit();
    } finally {
      this.enCours.set(false);
    }
  }

  onAnnuler(): void {
    this.annule.emit();
  }
}
