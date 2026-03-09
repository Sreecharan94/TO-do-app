// Script to add a 'todo' column to every board that does not have one
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const boards = await prisma.board.findMany();
  for (const board of boards) {
    const todoColumn = await prisma.column.findFirst({
      where: {
        boardId: board.id,
        name: { equals: 'todo', mode: 'insensitive' },
      },
    });
    if (!todoColumn) {
      await prisma.column.create({
        data: {
          name: 'todo',
          order: 1,
          boardId: board.id,
        },
      });
      console.log(`Added 'todo' column to board ${board.id}`);
    }
  }
  console.log('Done.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
