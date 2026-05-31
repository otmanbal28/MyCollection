// =============================================================
//  DashboardComponent — affiche les statistiques agrégées
//  (count, _sum, groupBy) calculées côté Prisma. Démontre
//  signals + computed + @for/@if.
// =============================================================
import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CollectionService } from '../services/collection.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private service = inject(CollectionService);

  readonly stats = this.service.stats;
  readonly historique = this.service.historique;

  readonly usesCount = computed(
    () => this.stats()?.parUsure.find((u) => u.usure === 'USE')?.count ?? 0
  );
  readonly neufsCount = computed(
    () => this.stats()?.parUsure.find((u) => u.usure === 'NEUF')?.count ?? 0
  );

  async ngOnInit(): Promise<void> {
    if (!this.stats()) {
      await this.service.chargerTout();
    }
    await this.service.chargerHistorique();
  }
}
