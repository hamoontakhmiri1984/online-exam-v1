// اسکریپت یک‌بارمصرف برای ساخت اولین حساب SuperAdmin. لازمه چون هیچ راه
// دیگه‌ای برای ساخت SuperAdmin نیست (نه از /register، نه seed خودکاری) و
// بدون حداقل یه SuperAdmin، هیچ مدرسی هم approve نمی‌شه.
//
// اجرا:
//   npx ts-node --transpile-only scripts/create-superadmin.ts <email> <password> [name]
//
// مثال:
//   npx ts-node --transpile-only scripts/create-superadmin.ts admin@test.com Passw0rd123 "مدیر سیستم"
//
// چون مستقیم passwordHash رو ست می‌کنه و emailVerifiedAt رو هم پر می‌کنه،
// بلافاصله با /auth/login/password قابل استفاده‌ست - نیازی به OTP نیست.
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
import { isPasswordValid } from '../src/lib/password';

async function main() {
  const [email, password, name] = process.argv.slice(2);

  if (!email || !password) {
    console.error(
      'استفاده: npx ts-node --transpile-only scripts/create-superadmin.ts <email> <password> [name]'
    );
    process.exit(1);
  }

  if (!isPasswordValid(password)) {
    console.error('رمز باید حداقل ۶ کاراکتر و شامل حداقل یه حرف و یه عدد باشه');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SuperAdmin',
      approvalStatus: 'Approved',
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      name: name ?? 'مدیر سیستم',
      role: 'SuperAdmin',
      approvalStatus: 'Approved',
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`SuperAdmin آماده‌ست: ${user.email} (id: ${user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
