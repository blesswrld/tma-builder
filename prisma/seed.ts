import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Начинаем заполнение базы данных...');

  const shop = await prisma.shop.upsert({
    where: { slug: 'barber-shop' },
    update: {},
    create: {
      slug: 'barber-shop',
      name: 'Барбершоп TopCut',
      description: 'Лучшие мужские стрижки, оформление бороды и премиальный уход.',
      services: {
        create: [
          { title: 'Мужская стрижка', price: 1500, description: 'Классическая или модельная стрижка от топ-мастера' },
          { title: 'Оформление бороды', price: 1000, description: 'Стрижка, окантовка и бритье с распариванием' },
          { title: 'Комплекс (Стрижка + Борода)', price: 2200, description: 'Полный спектр услуг со скидкой' },
          { title: 'Детская стрижка', price: 1200, description: 'Стильная стрижка для юных джентльменов' },
        ]
      }
    }
  });

  console.log('Тестовое заведение успешно создано:', shop.name);
}

main()
  .catch((e) => {
    console.error('Ошибка при заполнении БД:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
