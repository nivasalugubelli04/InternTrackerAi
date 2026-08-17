/**
 * Phase 25 — Skill Graph Seeding Script
 *
 * Run: npx ts-node apps/api/src/skills/seeds/skills-graph.seed.ts
 *
 * Seeds skills, aliases, relationships, role hierarchies, role-skill mappings,
 * and career paths to establish the initial relational skill graph in PostgreSQL.
 */
import {
  PrismaClient,
  SkillCategory,
  SkillRelationType,
  RoleSkillRequirement,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding Skill Graph Taxonomy...');

  // 1. Seed Skills with Extended Fields
  const skillsToSeed = [
    {
      name: 'JavaScript',
      category: SkillCategory.PROGRAMMING,
      aliases: ['JS'],
      description: 'High-level, dynamic, and interpreted programming language.',
    },
    {
      name: 'TypeScript',
      category: SkillCategory.PROGRAMMING,
      aliases: ['TS'],
      description: 'Strict syntactical superset of JavaScript adding optional static typing.',
    },
    {
      name: 'Python',
      category: SkillCategory.PROGRAMMING,
      aliases: ['Py'],
      description: 'Interpreted, high-level general-purpose programming language.',
    },
    {
      name: 'Java',
      category: SkillCategory.PROGRAMMING,
      aliases: ['Java8', 'Java17'],
      description: 'Class-based, object-oriented programming language designed for portability.',
    },
    {
      name: 'React',
      category: SkillCategory.FRONTEND,
      aliases: ['ReactJS', 'React.js'],
      description: 'Frontend JavaScript library for building user interfaces.',
    },
    {
      name: 'Spring Boot',
      category: SkillCategory.BACKEND,
      aliases: ['Spring'],
      description: 'Convention-over-configuration extension of the Spring framework for Java.',
    },
    {
      name: 'PostgreSQL',
      category: SkillCategory.DATABASE,
      aliases: ['Postgres'],
      description: 'Powerful, open-source object-relational database system.',
    },
    {
      name: 'Docker',
      category: SkillCategory.DEVOPS,
      aliases: ['Containers'],
      description:
        'Platform-as-a-service using OS-level virtualization to deliver software in containers.',
    },
    {
      name: 'Kubernetes',
      category: SkillCategory.DEVOPS,
      aliases: ['K8s'],
      description:
        'Open-source container orchestration engine for automated application deployment.',
    },
    {
      name: 'Machine Learning',
      category: SkillCategory.AI_ML,
      aliases: ['ML'],
      description:
        'Scientific study of algorithms and statistical models that computer systems use.',
    },
    {
      name: 'Named Entity Recognition',
      category: SkillCategory.AI_ML,
      aliases: ['NER'],
      description:
        'Subtask of information extraction that seeks to locate and classify entities in text.',
    },
    {
      name: 'Docker Compose',
      category: SkillCategory.DEVOPS,
      aliases: ['Compose'],
      description: 'Tool for defining and running multi-container Docker applications.',
    },
  ];

  const skillMap = new Map<string, string>(); // name -> UUID

  for (const s of skillsToSeed) {
    const record = await prisma.skill.upsert({
      where: { name: s.name },
      update: {
        aliases: s.aliases,
        description: s.description,
        status: 'ACTIVE',
      },
      create: {
        name: s.name,
        category: s.category,
        aliases: s.aliases,
        description: s.description,
        status: 'ACTIVE',
      },
    });
    skillMap.set(record.name, record.id);
  }
  console.log(`✅ Seeded ${skillMap.size} skills.`);

  // Helper to get UUIDs safely
  const getSkillId = (name: string): string => {
    const id = skillMap.get(name);
    if (!id) throw new Error(`Skill ${name} not found in map.`);
    return id;
  };

  // 2. Seed Skill Relationships
  const relations = [
    { from: 'React', to: 'JavaScript', type: SkillRelationType.REQUIRES, weight: 1.0 },
    { from: 'TypeScript', to: 'JavaScript', type: SkillRelationType.SUPERSET_OF, weight: 1.0 },
    { from: 'Spring Boot', to: 'Java', type: SkillRelationType.REQUIRES, weight: 1.0 },
    { from: 'Kubernetes', to: 'Docker', type: SkillRelationType.REQUIRES, weight: 0.9 },
    { from: 'Docker', to: 'Kubernetes', type: SkillRelationType.COMPLEMENTARY_TO, weight: 0.8 },
    {
      from: 'Machine Learning',
      to: 'Named Entity Recognition',
      type: SkillRelationType.SUPERSET_OF,
      weight: 0.7,
    },
    { from: 'Docker Compose', to: 'Docker', type: SkillRelationType.REQUIRES, weight: 1.0 },
  ];

  for (const r of relations) {
    const fromId = getSkillId(r.from);
    const toId = getSkillId(r.to);

    await prisma.skillRelationship.upsert({
      where: {
        fromSkillId_toSkillId_relationType: {
          fromSkillId: fromId,
          toSkillId: toId,
          relationType: r.type,
        },
      },
      update: { weight: r.weight },
      create: {
        fromSkillId: fromId,
        toSkillId: toId,
        relationType: r.type,
        weight: r.weight,
      },
    });
  }
  console.log(`✅ Seeded ${relations.length} skill relationships.`);

  // 3. Seed Canonical Role Taxonomy with Hierarchies
  const sweRole = await prisma.role.upsert({
    where: { name: 'Software Engineer' },
    update: { category: 'Software Development' },
    create: { name: 'Software Engineer', category: 'Software Development' },
  });

  const backendRole = await prisma.role.upsert({
    where: { name: 'Backend Engineer' },
    update: { parentId: sweRole.id, category: 'Software Development' },
    create: { name: 'Backend Engineer', parentId: sweRole.id, category: 'Software Development' },
  });

  const frontendRole = await prisma.role.upsert({
    where: { name: 'Frontend Engineer' },
    update: { parentId: sweRole.id, category: 'Software Development' },
    create: { name: 'Frontend Engineer', parentId: sweRole.id, category: 'Software Development' },
  });

  console.log('✅ Seeded canonical role hierarchy.');

  // 4. Seed Role-Skill relationships
  const roleSkills = [
    {
      roleId: backendRole.id,
      skill: 'Java',
      requirement: RoleSkillRequirement.REQUIRED,
      importance: 'HIGH',
      weight: 1.0,
    },
    {
      roleId: backendRole.id,
      skill: 'Spring Boot',
      requirement: RoleSkillRequirement.PREFERRED,
      importance: 'HIGH',
      weight: 0.8,
    },
    {
      roleId: backendRole.id,
      skill: 'PostgreSQL',
      requirement: RoleSkillRequirement.REQUIRED,
      importance: 'HIGH',
      weight: 0.9,
    },
    {
      roleId: backendRole.id,
      skill: 'Docker',
      requirement: RoleSkillRequirement.PREFERRED,
      importance: 'MEDIUM',
      weight: 0.7,
    },
    {
      roleId: frontendRole.id,
      skill: 'JavaScript',
      requirement: RoleSkillRequirement.REQUIRED,
      importance: 'HIGH',
      weight: 1.0,
    },
    {
      roleId: frontendRole.id,
      skill: 'TypeScript',
      requirement: RoleSkillRequirement.PREFERRED,
      importance: 'HIGH',
      weight: 0.8,
    },
    {
      roleId: frontendRole.id,
      skill: 'React',
      requirement: RoleSkillRequirement.REQUIRED,
      importance: 'HIGH',
      weight: 1.0,
    },
  ];

  for (const rs of roleSkills) {
    const sId = getSkillId(rs.skill);
    await prisma.roleSkill.upsert({
      where: {
        roleId_skillId: {
          roleId: rs.roleId,
          skillId: sId,
        },
      },
      update: {
        requirement: rs.requirement,
        importance: rs.importance,
        weight: rs.weight,
      },
      create: {
        roleId: rs.roleId,
        skillId: sId,
        requirement: rs.requirement,
        importance: rs.importance,
        weight: rs.weight,
      },
    });
  }
  console.log(`✅ Seeded ${roleSkills.length} role-skill pairs.`);

  // 5. Seed Career Paths
  const backendPath = await prisma.careerPath.upsert({
    where: { title: 'Backend Web Development Path' },
    update: { description: 'Canonical career steps to become a Senior Backend Engineer.' },
    create: {
      title: 'Backend Web Development Path',
      description: 'Canonical career steps to become a Senior Backend Engineer.',
    },
  });

  const steps = [
    { stepNumber: 1, roleId: sweRole.id, skills: ['JavaScript'] },
    { stepNumber: 2, roleId: backendRole.id, skills: ['Java', 'PostgreSQL'] },
    { stepNumber: 3, roleId: backendRole.id, skills: ['Spring Boot', 'Docker'] },
  ];

  for (const step of steps) {
    const stepRecord = await prisma.careerPathStep.upsert({
      where: {
        careerPathId_stepNumber: {
          careerPathId: backendPath.id,
          stepNumber: step.stepNumber,
        },
      },
      update: { roleId: step.roleId },
      create: {
        careerPathId: backendPath.id,
        roleId: step.roleId,
        stepNumber: step.stepNumber,
      },
    });

    for (const skillName of step.skills) {
      const sId = getSkillId(skillName);
      await prisma.careerPathSkill.upsert({
        where: {
          stepId_skillId: {
            stepId: stepRecord.id,
            skillId: sId,
          },
        },
        update: { isPrimary: true },
        create: {
          stepId: stepRecord.id,
          skillId: sId,
          isPrimary: true,
        },
      });
    }
  }
  console.log('✅ Seeded career path steps and skills.');

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
