import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'node:crypto';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) throw Error('Set ADMIN_EMAIL and a 12+ character ADMIN_PASSWORD in private env');
const salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
const db = new PrismaClient();
try { await db.admin.upsert({where:{email},create:{email,passwordHash},update:{passwordHash}}); console.log('Admin account initialized:', email); }
finally { await db.$disconnect(); }
