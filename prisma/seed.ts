// =============================================================
//  Seed — peuple la base avec des données de test.
//  Lancé via : npm run seed
// =============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // On repart propre (ordre inverse des dépendances).
  await prisma.historiqueAction.deleteMany();
  await prisma.itemTag.deleteMany();
  await prisma.emprunt.deleteMany();
  await prisma.item.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.localisation.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.categorie.deleteMany();

  // Catégorie par défaut (la relation Collection→Categorie est obligatoire).
  const general = await prisma.categorie.create({ data: { nom: 'Général' } });

  // Quelques collections.
  const colJeux = await prisma.collection.create({
    data: { nom: 'Jeux de plateau', categorieId: general.id },
  });
  const colBd = await prisma.collection.create({
    data: { nom: 'Bandes dessinées', categorieId: general.id },
  });

  // Items de démonstration.
  await prisma.item.create({
    data: {
      nom: 'Catan',
      nombre: 1,
      usure: 'USE',
      description: 'Boîte un peu abîmée',
      collectionId: colJeux.id,
    },
  });

  await prisma.item.create({
    data: {
      nom: 'Échecs en bois',
      nombre: 2,
      usure: 'NEUF',
      collectionId: colJeux.id,
    },
  });

  await prisma.item.create({
    data: {
      nom: 'Tintin — collection complète',
      nombre: 24,
      usure: 'USE',
      description: 'Quelques éditions originales',
      collectionId: colBd.id,
    },
  });

  await prisma.historiqueAction.create({
    data: { action: 'SEED', details: 'Données de test initiales' },
  });

  console.log('Base peuplée avec succès.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
