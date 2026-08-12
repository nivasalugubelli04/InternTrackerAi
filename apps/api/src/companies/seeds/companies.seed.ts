import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Technology', icon: '💻' },
  { name: 'Product', icon: '📦' },
  { name: 'Startup', icon: '🚀' },
  { name: 'Finance', icon: '💰' },
  { name: 'Consulting', icon: '💼' },
  { name: 'AI', icon: '🤖' },
  { name: 'Healthcare', icon: '🏥' },
  { name: 'E-commerce', icon: '🛒' },
  { name: 'Gaming', icon: '🎮' },
  { name: 'Manufacturing', icon: '🏭' },
  { name: 'Telecom', icon: '📡' },
  { name: 'Cloud', icon: '☁️' },
  { name: 'Automobile', icon: '🚗' },
  { name: 'Government', icon: '🏛️' },
  { name: 'Research', icon: '🔬' },
];

const COMPANIES = [
  {
    name: 'Google',
    domain: 'google.com',
    category: 'Technology',
    desc: "Organizing the world's information",
  },
  {
    name: 'Microsoft',
    domain: 'microsoft.com',
    category: 'Technology',
    desc: 'Empowering every person and organization',
  },
  {
    name: 'Amazon',
    domain: 'amazon.jobs',
    category: 'E-commerce',
    desc: "Earth's most customer-centric company",
  },
  { name: 'Apple', domain: 'apple.com', category: 'Technology', desc: 'Think different' },
  { name: 'Meta', domain: 'metacareers.com', category: 'Technology', desc: 'Connecting the world' },
  {
    name: 'Netflix',
    domain: 'netflix.com',
    category: 'Technology',
    desc: 'Entertainment for the world',
  },
  {
    name: 'Tesla',
    domain: 'tesla.com',
    category: 'Automobile',
    desc: "Accelerating the world's transition to sustainable energy",
  },
  {
    name: 'NVIDIA',
    domain: 'nvidia.com',
    category: 'AI',
    desc: 'Pioneering accelerated computing',
  },
  { name: 'Adobe', domain: 'adobe.com', category: 'Product', desc: 'Creativity for all' },
  {
    name: 'Oracle',
    domain: 'oracle.com',
    category: 'Cloud',
    desc: 'Integrated cloud applications and platform services',
  },
  { name: 'Salesforce', domain: 'salesforce.com', category: 'Cloud', desc: 'The customer company' },
  {
    name: 'Atlassian',
    domain: 'atlassian.com',
    category: 'Product',
    desc: 'Unleashing the potential in every team',
  },
  { name: 'Uber', domain: 'uber.com', category: 'Technology', desc: 'Go anywhere, get anything' },
  {
    name: 'Flipkart',
    domain: 'flipkart.com',
    category: 'E-commerce',
    desc: "India's favorite online shopping destination",
  },
  {
    name: 'PhonePe',
    domain: 'phonepe.com',
    category: 'Finance',
    desc: 'A payment platform that empowers individuals',
  },
  {
    name: 'Paytm',
    domain: 'paytm.com',
    category: 'Finance',
    desc: "India's leading financial services company",
  },
  {
    name: 'Zoho',
    domain: 'zoho.com',
    category: 'Product',
    desc: 'The operating system for business',
  },
  {
    name: 'Freshworks',
    domain: 'freshworks.com',
    category: 'Product',
    desc: "Software that's intuitive and easy to use",
  },
  { name: 'Infosys', domain: 'infosys.com', category: 'Consulting', desc: 'Navigate your next' },
  { name: 'TCS', domain: 'tcs.com', category: 'Consulting', desc: 'Building on belief' },
  {
    name: 'Wipro',
    domain: 'wipro.com',
    category: 'Consulting',
    desc: 'Engineering a better world',
  },
  {
    name: 'Accenture',
    domain: 'accenture.com',
    category: 'Consulting',
    desc: 'Let there be change',
  },
  {
    name: 'Capgemini',
    domain: 'capgemini.com',
    category: 'Consulting',
    desc: 'Get the future you want',
  },
  {
    name: 'Deloitte',
    domain: 'deloitte.com',
    category: 'Consulting',
    desc: 'Making an impact that matters',
  },
  {
    name: 'Goldman Sachs',
    domain: 'goldmansachs.com',
    category: 'Finance',
    desc: 'Global investment banking',
  },
  {
    name: 'Morgan Stanley',
    domain: 'morganstanley.com',
    category: 'Finance',
    desc: 'Financial services',
  },
  {
    name: 'JP Morgan',
    domain: 'jpmorgan.com',
    category: 'Finance',
    desc: 'Global financial services firm',
  },
  {
    name: 'Samsung',
    domain: 'samsung.com',
    category: 'Technology',
    desc: 'Inspire the world, create the future',
  },
  { name: 'Intel', domain: 'intel.com', category: 'Technology', desc: 'Do something wonderful' },
  {
    name: 'Qualcomm',
    domain: 'qualcomm.com',
    category: 'Telecom',
    desc: 'Inventing the tech the world loves',
  },
  { name: 'Cisco', domain: 'cisco.com', category: 'Telecom', desc: 'The bridge to possible' },
  { name: 'IBM', domain: 'ibm.com', category: 'Cloud', desc: "Let's create" },
  { name: 'AMD', domain: 'amd.com', category: 'Technology', desc: 'Together we advance' },
  {
    name: 'ServiceNow',
    domain: 'servicenow.com',
    category: 'Cloud',
    desc: 'The smarter way to workflow',
  },
  { name: 'CRED', domain: 'cred.club', category: 'Finance', desc: 'Reward yourself' },
  {
    name: 'Razorpay',
    domain: 'razorpay.com',
    category: 'Finance',
    desc: 'Payment gateway for India',
  },
  {
    name: 'Meesho',
    domain: 'meesho.com',
    category: 'E-commerce',
    desc: 'Democratising internet commerce',
  },
  { name: 'Swiggy', domain: 'swiggy.com', category: 'E-commerce', desc: 'Delivering happiness' },
  {
    name: 'Zomato',
    domain: 'zomato.com',
    category: 'E-commerce',
    desc: 'Discover great places to eat',
  },
  {
    name: 'Myntra',
    domain: 'myntra.com',
    category: 'E-commerce',
    desc: 'Online fashion destination',
  },
  { name: 'Dream11', domain: 'dream11.com', category: 'Gaming', desc: 'Play fantasy sports' },
];

async function main() {
  console.log('🌱 Seeding Companies Database...');

  // Categories
  const catMap = new Map<string, string>();
  for (const c of CATEGORIES) {
    const created = await prisma.companyCategory.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, icon: c.icon },
    });
    catMap.set(c.name, created.id);
  }

  // 40+ Top Companies (expanding to 150+ with a generic loop)
  let count = 0;
  for (const c of COMPANIES) {
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const catId = catMap.get(c.category);
    await prisma.company.upsert({
      where: { slug },
      update: {},
      create: {
        name: c.name,
        slug,
        website: `https://${c.domain}`,
        careerPageUrl: `https://${c.domain}/careers`,
        logoUrl: `https://logo.clearbit.com/${c.domain}`,
        industry: c.category,
        description: c.desc,
        headquarters: 'Global',
        parserType: 'UNASSIGNED',
        ...(catId ? { categories: { connect: [{ id: catId }] } } : {}),
      },
    });
    count++;
  }

  // Generate the rest to reach 150
  for (let i = count + 1; i <= 150; i++) {
    const name = `Tech Startup ${i}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const targetCat = CATEGORIES[i % CATEGORIES.length];
    const category = targetCat?.name ?? 'Software & Tech';
    const catId = catMap.get(category);
    await prisma.company.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        website: `https://startup${i}.example.com`,
        careerPageUrl: `https://startup${i}.example.com/careers`,
        logoUrl: `https://ui-avatars.com/api/?name=TS${i}&background=random`,
        industry: category,
        description: `An innovative startup revolutionizing ${category}.`,
        headquarters: 'San Francisco, CA',
        parserType: 'UNASSIGNED',
        ...(catId ? { categories: { connect: [{ id: catId }] } } : {}),
      },
    });
  }

  console.log('✅ 150 Companies Seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
