import "dotenv/config";
import { prisma } from "../packages/api/src/db/client";
import { hashPassword } from "../packages/api/src/utils/hash";

// D-11: reception staff accounts are provisioned OUT of the app in v1
// (AUTH-04, account management from the app, is v2). This idempotent seed
// creates/updates a single test account from environment variables — the
// password is NEVER hardcoded (SEC-04) and is hashed here, never stored or
// read as a pre-hashed value.
async function main() {
  // WR-06: normalize (trim + lowercase) to match the login-time normalization,
  // so the seeded account is always found regardless of the casing typed at
  // login and no case-variant duplicate can be provisioned.
  const email = (process.env.RECEPTION_EMAIL || "recepcion@test.local")
    .trim()
    .toLowerCase();
  const plainPassword = process.env.RECEPTION_PASSWORD;

  if (!plainPassword) {
    console.error(
      "RECEPTION_PASSWORD no está definido. Aborta el seed sin crear/actualizar la cuenta.",
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(plainPassword);

  const personal = await prisma.personalDeRecepcion.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      nombre: "Recepcionista",
      apellidoPaterno: "Test",
      apellidoMaterno: "Dev",
      telefono: "5550000000",
      activo: true,
      passwordHash,
    },
  });

  console.log(`Cuenta de personal aprovisionada: ${personal.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
