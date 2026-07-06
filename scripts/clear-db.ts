import { PrismaClient, UserRole } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminFilter = adminEmail
    ? { email: adminEmail }
    : { role: 'ADMIN' as UserRole }

  const admins = await db.user.findMany({ where: adminFilter })

  if (admins.length === 0) {
    throw new Error(
      adminEmail
        ? `No admin user found for email ${adminEmail}. Set ADMIN_EMAIL or create an admin first.`
        : 'No admin user found. Create an admin user before clearing the database.'
    )
  }

  console.log(`Preserving ${admins.length} admin user(s).`)

  console.log('Clearing site data from the database...')

  await db.$transaction([
    db.orderNote.deleteMany({}),
    db.orderStatusHistory.deleteMany({}),
    db.transaction.deleteMany({}),
    db.orderAddress.deleteMany({}),
    db.orderItem.deleteMany({}),
    db.order.deleteMany({}),
    db.cartItem.deleteMany({}),
    db.wishlistItem.deleteMany({}),
    db.review.deleteMany({}),
    db.address.deleteMany({}),
    db.inventoryReservation.deleteMany({}),
    db.productImage.deleteMany({}),
    db.productVariant.deleteMany({}),
    db.product.deleteMany({}),
    db.specValue.deleteMany({}),
    db.specKey.deleteMany({}),
    db.category.deleteMany({}),
    db.brand.deleteMany({}),
    db.coupon.deleteMany({}),
    db.cart.deleteMany({}),
    db.session.deleteMany({}),
    db.user.deleteMany({ where: { role: { not: 'ADMIN' } } }),
  ])

  console.log('All non-admin data cleared.')
  console.log('Reminder: only admin user accounts remain in the database.')
}

main()
  .catch((error) => {
    console.error('Failed to clear database:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
