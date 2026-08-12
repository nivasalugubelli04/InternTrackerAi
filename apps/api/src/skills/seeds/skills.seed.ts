/**
 * Skills Seed Script — Phase 2
 *
 * Run: npx ts-node apps/api/src/skills/seeds/skills.seed.ts
 *
 * Seeds 85 skills across 11 categories for the global skills catalog.
 * Uses upsert so it is idempotent (safe to re-run).
 */
import type { SkillCategory } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SKILLS: { name: string; category: SkillCategory }[] = [
  // ── Programming Languages ─────────────────────────────────────────────────
  { name: 'Python', category: 'PROGRAMMING' },
  { name: 'JavaScript', category: 'PROGRAMMING' },
  { name: 'TypeScript', category: 'PROGRAMMING' },
  { name: 'Java', category: 'PROGRAMMING' },
  { name: 'C++', category: 'PROGRAMMING' },
  { name: 'C', category: 'PROGRAMMING' },
  { name: 'Go', category: 'PROGRAMMING' },
  { name: 'Rust', category: 'PROGRAMMING' },
  { name: 'Kotlin', category: 'PROGRAMMING' },
  { name: 'Swift', category: 'PROGRAMMING' },
  { name: 'PHP', category: 'PROGRAMMING' },
  { name: 'Ruby', category: 'PROGRAMMING' },
  { name: 'Dart', category: 'PROGRAMMING' },
  { name: 'Scala', category: 'PROGRAMMING' },

  // ── Frontend ──────────────────────────────────────────────────────────────
  { name: 'React', category: 'FRONTEND' },
  { name: 'Vue.js', category: 'FRONTEND' },
  { name: 'Angular', category: 'FRONTEND' },
  { name: 'Next.js', category: 'FRONTEND' },
  { name: 'Nuxt.js', category: 'FRONTEND' },
  { name: 'HTML5', category: 'FRONTEND' },
  { name: 'CSS3', category: 'FRONTEND' },
  { name: 'Tailwind CSS', category: 'FRONTEND' },
  { name: 'SASS/SCSS', category: 'FRONTEND' },
  { name: 'Redux', category: 'FRONTEND' },
  { name: 'Zustand', category: 'FRONTEND' },
  { name: 'Webpack', category: 'FRONTEND' },
  { name: 'Vite', category: 'FRONTEND' },

  // ── Backend ───────────────────────────────────────────────────────────────
  { name: 'Node.js', category: 'BACKEND' },
  { name: 'NestJS', category: 'BACKEND' },
  { name: 'Express.js', category: 'BACKEND' },
  { name: 'FastAPI', category: 'BACKEND' },
  { name: 'Django', category: 'BACKEND' },
  { name: 'Flask', category: 'BACKEND' },
  { name: 'Spring Boot', category: 'BACKEND' },
  { name: 'GraphQL', category: 'BACKEND' },
  { name: 'REST APIs', category: 'BACKEND' },
  { name: 'gRPC', category: 'BACKEND' },
  { name: 'WebSockets', category: 'BACKEND' },

  // ── Database ──────────────────────────────────────────────────────────────
  { name: 'PostgreSQL', category: 'DATABASE' },
  { name: 'MySQL', category: 'DATABASE' },
  { name: 'MongoDB', category: 'DATABASE' },
  { name: 'Redis', category: 'DATABASE' },
  { name: 'SQLite', category: 'DATABASE' },
  { name: 'Prisma ORM', category: 'DATABASE' },
  { name: 'TypeORM', category: 'DATABASE' },
  { name: 'Elasticsearch', category: 'DATABASE' },
  { name: 'Supabase', category: 'DATABASE' },
  { name: 'Firebase', category: 'DATABASE' },

  // ── AI / ML ───────────────────────────────────────────────────────────────
  { name: 'Machine Learning', category: 'AI_ML' },
  { name: 'Deep Learning', category: 'AI_ML' },
  { name: 'TensorFlow', category: 'AI_ML' },
  { name: 'PyTorch', category: 'AI_ML' },
  { name: 'scikit-learn', category: 'AI_ML' },
  { name: 'Natural Language Processing', category: 'AI_ML' },
  { name: 'Computer Vision', category: 'AI_ML' },
  { name: 'LangChain', category: 'AI_ML' },
  { name: 'OpenAI API', category: 'AI_ML' },

  // ── Cloud ─────────────────────────────────────────────────────────────────
  { name: 'AWS', category: 'CLOUD' },
  { name: 'Google Cloud', category: 'CLOUD' },
  { name: 'Azure', category: 'CLOUD' },
  { name: 'Vercel', category: 'CLOUD' },
  { name: 'Netlify', category: 'CLOUD' },
  { name: 'Cloudflare', category: 'CLOUD' },

  // ── DevOps ────────────────────────────────────────────────────────────────
  { name: 'Docker', category: 'DEVOPS' },
  { name: 'Kubernetes', category: 'DEVOPS' },
  { name: 'CI/CD', category: 'DEVOPS' },
  { name: 'GitHub Actions', category: 'DEVOPS' },
  { name: 'Terraform', category: 'DEVOPS' },
  { name: 'Linux', category: 'DEVOPS' },
  { name: 'Nginx', category: 'DEVOPS' },

  // ── Mobile ────────────────────────────────────────────────────────────────
  { name: 'React Native', category: 'MOBILE' },
  { name: 'Flutter', category: 'MOBILE' },
  { name: 'iOS Development', category: 'MOBILE' },
  { name: 'Android Development', category: 'MOBILE' },
  { name: 'Expo', category: 'MOBILE' },

  // ── Testing ───────────────────────────────────────────────────────────────
  { name: 'Jest', category: 'TESTING' },
  { name: 'Cypress', category: 'TESTING' },
  { name: 'Playwright', category: 'TESTING' },
  { name: 'Unit Testing', category: 'TESTING' },
  { name: 'Integration Testing', category: 'TESTING' },

  // ── Version Control ───────────────────────────────────────────────────────
  { name: 'Git', category: 'VERSION_CONTROL' },
  { name: 'GitHub', category: 'VERSION_CONTROL' },
  { name: 'GitLab', category: 'VERSION_CONTROL' },

  // ── Soft Skills ───────────────────────────────────────────────────────────
  { name: 'Problem Solving', category: 'SOFT_SKILLS' },
  { name: 'Communication', category: 'SOFT_SKILLS' },
  { name: 'Teamwork', category: 'SOFT_SKILLS' },
  { name: 'Leadership', category: 'SOFT_SKILLS' },
  { name: 'Time Management', category: 'SOFT_SKILLS' },
  { name: 'Critical Thinking', category: 'SOFT_SKILLS' },
  { name: 'Agile / Scrum', category: 'SOFT_SKILLS' },
];

async function main(): Promise<void> {
  console.log(`🌱 Seeding ${SKILLS.length} skills...`);

  let created = 0;
  let updated = 0;

  for (const skill of SKILLS) {
    const result = await prisma.skill.upsert({
      where: { name: skill.name },
      create: skill,
      update: { category: skill.category },
    });
    if (result.name === skill.name) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`✅ Done: ${created} created, ${updated} updated`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
