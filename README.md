# MyCollection — Electron + Angular + Prisma

Application de bureau de gestion d'inventaire de collections, réalisée pour le
projet SGBD. Architecture **Electron** (main / preload / renderer), **Angular**
en renderer, **Prisma** comme ORM sur une base **SQLite locale**.

---

## Installation

Prérequis : **Node.js ≥ 18** et **npm**.

```bash
# 1. Installer les dépendances
npm install

# 2. Créer la base SQLite et appliquer le schéma
npx prisma migrate dev --name init

# 3. (Facultatif) Peupler la base avec des données de test
npm run seed
```

## Lancement

```bash
npm run start
```

Cette commande **build l'app Angular**, **compile le code Electron**, puis
**lance la fenêtre Electron**. C'est la seule commande nécessaire.

### Mode développement (rechargement à chaud Angular)

Dans deux terminaux séparés :

```bash
npm run dev:angular   # Terminal 1 — sert Angular sur http://localhost:4200
npm run dev:electron  # Terminal 2 — lance Electron en mode --serve
```

---

## Architecture

```
collection-manager/
├── prisma/
│   ├── schema.prisma     # 8 modèles, relations, onDelete
│   └── seed.ts           # données de test
├── electron/             # PROCESSUS PRINCIPAL (Node)
│   ├── main.ts           # crée la BrowserWindow, charge Angular
│   ├── preload.ts        # expose window.api via contextBridge
│   ├── ipc-handlers.ts   # tous les appels Prisma (ipcMain.handle)
│   └── prisma-client.ts  # instance Prisma partagée
├── src/                  # RENDERER (Angular)
│   └── app/
│       ├── components/   # dashboard, items-page, item-card, item-form
│       ├── services/     # collection.service.ts (état + logique métier)
│       ├── models/       # interfaces TypeScript + typage de window.api
│       ├── app.routes.ts # 2 routes (dashboard, items)
│       └── app.config.ts # provideRouter
└── docs/
    └── schema.drawio     # schéma de la base (ouvrable sur draw.io)
```

**Flux de données :** le renderer Angular n'accède **jamais** directement à Node
ni à Prisma. Il appelle `window.api.*` (exposé par le preload), qui déclenche un
`ipcRenderer.invoke`, reçu côté main par `ipcMain.handle`, qui exécute la requête
Prisma et renvoie le résultat.

```
Angular (service)  →  window.api  →  ipcRenderer.invoke
                                          ↓
                              ipcMain.handle  →  Prisma  →  SQLite
```

---

## Modèle de données (annexe 5.2)

| Notion | Où c'est implémenté |
|---|---|
| **≥ 7 modèles** | 8 modèles : `Categorie`, `Collection`, `Item`, `Tag`, `ItemTag`, `Localisation`, `Emprunt`, `HistoriqueAction` |
| **Clé primaire** | `id Int @id @default(autoincrement())` sur chaque table |
| **Relation 1:N** | `Categorie→Collection`, `Collection→Item`, `Localisation→Item`, `Item→Emprunt` |
| **Jonction N:M** | `ItemTag` (table pivot explicite, `@@id([itemId, tagId])`) entre `Item` et `Tag` |
| **ON DELETE** | `Cascade` (Collection→Item), `Restrict` (Categorie→Collection), `SetNull` (Localisation→Item) |
| **JOIN / include** | `item:list` et `collection:list` chargent les relations via `include` |
| **Agrégat** | `stats:global` : `count()`, `aggregate({ _sum })`, `groupBy()` — affichés sur le tableau de bord |
| **CRUD complet** | sur `Item` : `create`, `findMany`, `update`, `delete` |
| **Champs optionnels** | `description String?`, `piece String?`, `localisationId Int?` |

> Note : le schéma conserve les modèles `Tag`, `ItemTag` (jonction N:M), `Localisation`
> et `Emprunt` pour couvrir toutes les notions de modélisation exigées. L'interface
> se concentre volontairement sur la gestion des items et de leur collection ; les
> autres tables restent disponibles côté base de données et démontrables via le seed.
| **Enum (bonus)** | SQLite ne supporte pas les `enum` Prisma natifs : `usure` est un `String` contraint à `"NEUF"`/`"USE"` (validé côté Angular). Avec PostgreSQL/MySQL on écrirait `enum EtatUsure { NEUF USE }` |

---

## Concepts Angular (annexe 5.1)

| Notion | Où |
|---|---|
| Composants standalone (≥ 3) | `app`, `dashboard`, `items-page`, `item-card`, `item-form` |
| Interfaces TypeScript | `src/app/models/models.ts` |
| Signals | `collection.service.ts` (`signal()`), `items-page` (`signal()`) |
| Computed | `nombreItems`, `itemsFiltres`, `usesCount`… |
| @for / @if | tous les templates |
| Service + DI | `CollectionService` injecté via `inject()` |
| Singleton | `@Injectable({ providedIn: 'root' })` |
| input() | `item-card` (`input.required<Item>()`), `item-form` |
| output() | `item-card` (`modifier`, `supprimer`), `item-form` |
| Formulaires réactifs | `item-form` (`fb.group` + `Validators`) |
| Routage (≥ 2 routes) | `app.routes.ts` (dashboard + items) + `<router-outlet>` |
| RouterLink | barre de navigation (`app.component.html`) |
| effect() (bonus) | `items-page` (log sur changement du nombre d'items) |

---

## Transactions Prisma (`$transaction`)

Conformément au point 15 de la synthèse Prisma, les deux syntaxes sont utilisées
dans `electron/ipc-handlers.ts` :

- **Syntaxe fonction `async (tx) => {…}`** — quand des opérations dépendent les
  unes des autres : recherche-ou-création de la collection (find-or-create),
  **puis** création/modification de l'item, **puis** écriture dans l'historique
  (`item:create`, `item:update`, `item:delete`). Si une étape échoue, tout est
  annulé (rien n'est écrit en base).
- **Syntaxe tableau `[…]`** — opérations indépendantes : suppression en masse des
  items usés **et** écriture de l'historique (`item:deleteUsed`).

---

## Fonctionnalité principale

Sur la page **Items**, le bouton « + Nouvel item » ouvre un formulaire permettant
de créer un item avec :

- le **nom de la collection** (la collection est créée automatiquement si elle n'existe pas) ;
- le **nom de l'item** ;
- le **nombre** ;
- deux boutons **Oui / Non** pour indiquer si la collection est usée ;
- une **description facultative**.

La création de l'item et de sa collection se fait dans une **transaction Prisma**
unique (find-or-create de la collection + création de l'item + historique).

---

## Scripts npm

| Script | Effet |
|---|---|
| `npm run start` | build Angular + Electron puis lance l'app |
| `npm run seed` | peuple la base de données de test |
| `npm run prisma:migrate` | crée/applique la migration initiale |
| `npm run prisma:generate` | régénère le client Prisma |
| `npm run dev:angular` | serveur de dev Angular |
| `npm run dev:electron` | Electron en mode dev |

---

Auteur : **BALHOR OTMAN** — MAI 2026
