import { prisma } from './src/lib/prisma'

async function main() {
  const user = await prisma.user.findFirst()
  console.log(user)
}

main()
