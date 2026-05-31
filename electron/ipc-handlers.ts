// =============================================================
//  Handlers IPC — toute l'interaction avec Prisma vit ici,
//  dans le main process. Le renderer n'y accède que via
//  ipcRenderer.invoke (exposé par le preload).
//
//  Chaque handler est enveloppé dans un try/catch et renvoie
//  une réponse uniforme { ok, data } | { ok:false, error }.
// =============================================================
import { ipcMain } from 'electron';
import { prisma } from './prisma-client';
import { Prisma } from '@prisma/client';

// Petit utilitaire : enveloppe un handler dans un try/catch
// et formate la réponse de manière homogène.
function handle<T>(channel: string, fn: (payload: any) => Promise<T>) {
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      const data = await fn(payload);
      return { ok: true, data };
    } catch (error: any) {
      console.error(`[IPC ${channel}]`, error);
      return { ok: false, error: error?.message ?? 'Erreur inconnue' };
    }
  });
}

// Catégorie par défaut : la relation Collection→Categorie est
// obligatoire dans le schéma. Comme l'UI ne gère que des items et
// un nom de collection, on rattache toute collection créée à la
// volée à une catégorie « Général » (créée si elle n'existe pas).
async function categorieParDefautId(tx: Prisma.TransactionClient): Promise<number> {
  const existante = await tx.categorie.findUnique({ where: { nom: 'Général' } });
  if (existante) return existante.id;
  const creee = await tx.categorie.create({ data: { nom: 'Général' } });
  return creee.id;
}

// Find-or-create d'une collection à partir de son nom.
async function trouverOuCreerCollection(
  tx: Prisma.TransactionClient,
  nom: string
): Promise<number> {
  const existante = await tx.collection.findFirst({ where: { nom } });
  if (existante) return existante.id;
  const categorieId = await categorieParDefautId(tx);
  const creee = await tx.collection.create({ data: { nom, categorieId } });
  return creee.id;
}

export function registerIpcHandlers() {
  // ---------------------------------------------------------
  //  COLLECTIONS  (include = JOIN sur la catégorie)
  // ---------------------------------------------------------
  handle('collection:list', () =>
    prisma.collection.findMany({
      include: { categorie: true, _count: { select: { items: true } } },
      orderBy: { nom: 'asc' },
    })
  );

  // ---------------------------------------------------------
  //  ITEMS — CRUD complet + include
  // ---------------------------------------------------------

  // Lecture avec relations chargées (JOIN).
  handle('item:list', (payload?: { collectionId?: number }) =>
    prisma.item.findMany({
      where: payload?.collectionId ? { collectionId: payload.collectionId } : undefined,
      include: {
        collection: { include: { categorie: true } },
      },
      orderBy: { id: 'desc' },
    })
  );

  handle('item:get', (id: number) =>
    prisma.item.findUnique({
      where: { id },
      include: {
        collection: { include: { categorie: true } },
        emprunts: true,
      },
    })
  );

  // CREATE — l'item demandé : nom, nom de collection, nombre,
  // usure (oui/non), description. Tout dans une TRANSACTION
  // (point 15) : find-or-create de la collection + création de
  // l'item + écriture de l'historique réussissent ensemble, ou
  // rien n'est écrit.
  handle(
    'item:create',
    (data: {
      nom: string;
      collectionNom: string;
      nombre: number;
      usure: 'NEUF' | 'USE';
      description?: string;
    }) =>
      prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const collectionId = await trouverOuCreerCollection(tx, data.collectionNom);

        const item = await tx.item.create({
          data: {
            nom: data.nom,
            nombre: data.nombre,
            usure: data.usure,
            description: data.description || null,
            collectionId,
          },
          include: { collection: true },
        });

        await tx.historiqueAction.create({
          data: {
            action: 'CREATION_ITEM',
            details: `Item #${item.id} « ${item.nom} » créé`,
          },
        });

        return item;
      })
  );

  // UPDATE — met à jour les champs et le rattachement à la
  // collection (find-or-create) dans une transaction atomique.
  handle(
    'item:update',
    (data: {
      id: number;
      nom: string;
      collectionNom: string;
      nombre: number;
      usure: 'NEUF' | 'USE';
      description?: string;
    }) =>
      prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const collectionId = await trouverOuCreerCollection(tx, data.collectionNom);

        const item = await tx.item.update({
          where: { id: data.id },
          data: {
            nom: data.nom,
            nombre: data.nombre,
            usure: data.usure,
            description: data.description || null,
            collectionId,
          },
          include: { collection: true },
        });

        await tx.historiqueAction.create({
          data: { action: 'MODIFICATION_ITEM', details: `Item #${item.id} modifié` },
        });

        return item;
      })
  );

  // DELETE — supprime l'item + trace l'action (transaction).
  handle('item:delete', (id: number) =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const item = await tx.item.delete({ where: { id } });
      await tx.historiqueAction.create({
        data: { action: 'SUPPRESSION_ITEM', details: `Item #${id} « ${item.nom} » supprimé` },
      });
      return { id };
    })
  );

  // Suppression multiple via transaction tableau (opérations
  // indépendantes : suppression en masse + historique).
  handle('item:deleteUsed', () =>
    prisma.$transaction([
      prisma.item.deleteMany({ where: { usure: 'USE' } }),
      prisma.historiqueAction.create({
        data: { action: 'SUPPRESSION_USES', details: 'Tous les items usés supprimés' },
      }),
    ])
  );

  // ---------------------------------------------------------
  //  AGRÉGATS / STATISTIQUES (count, groupBy, _sum)
  // ---------------------------------------------------------
  handle('stats:global', async () => {
    const totalItems = await prisma.item.count();
    const totalCollections = await prisma.collection.count();

    // Somme du champ "nombre" sur tous les items.
    const sommeNombre = await prisma.item.aggregate({ _sum: { nombre: true } });

    // Comptage groupé par état d'usure.
    const parUsure = await prisma.item.groupBy({
      by: ['usure'],
      _count: { _all: true },
    });

    return {
      totalItems,
      totalCollections,
      sommeNombre: sommeNombre._sum.nombre ?? 0,
      parUsure: parUsure.map((g: { usure: string; _count: { _all: number } }) => ({
        usure: g.usure,
        count: g._count._all,
      })),
    };
  });

  // ---------------------------------------------------------
  //  HISTORIQUE
  // ---------------------------------------------------------
  handle('historique:list', () =>
    prisma.historiqueAction.findMany({ orderBy: { creeLe: 'desc' }, take: 50 })
  );
}
