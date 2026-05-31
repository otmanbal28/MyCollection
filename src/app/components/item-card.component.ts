// =============================================================
//  ItemCardComponent — affiche un item. Reçoit l'item via
//  input.required(), émet "modifier" et "supprimer" via output().
//  Illustre la communication enfant → parent.
// =============================================================
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item } from '../models/models';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.css',
})
export class ItemCardComponent {
  // input.required — un item est obligatoire pour afficher la carte.
  item = input.required<Item>();

  // output — événements remontés au parent.
  modifier = output<Item>();
  supprimer = output<number>();
}
