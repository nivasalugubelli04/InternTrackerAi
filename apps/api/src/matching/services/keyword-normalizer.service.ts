import { Injectable } from '@nestjs/common';

@Injectable()
export class KeywordNormalizerService {
  private readonly synonymMap: Record<string, string> = {
    // Languages & Runtimes
    js: 'JavaScript',
    javascript: 'JavaScript',
    reactjs: 'React',
    'react.js': 'React',
    react: 'React',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    nodejs: 'Node.js',
    'node.js': 'Node.js',
    node: 'Node.js',
    py: 'Python',
    python: 'Python',
    python3: 'Python',
    cpp: 'C++',
    'c++': 'C++',
    csharp: 'C#',
    'c#': 'C#',
    cs: 'C#',
    golang: 'Go',
    go: 'Go',
    java: 'Java',
    kotlin: 'Kotlin',
    swift: 'Swift',
    ruby: 'Ruby',
    php: 'PHP',
    rust: 'Rust',

    // Web & Frameworks
    html: 'HTML',
    html5: 'HTML',
    css: 'CSS',
    css3: 'CSS',
    tailwind: 'Tailwind CSS',
    tailwindcss: 'Tailwind CSS',
    bootstrap: 'Bootstrap',
    express: 'Express.js',
    expressjs: 'Express.js',
    nestjs: 'NestJS',
    nest: 'NestJS',
    nextjs: 'Next.js',
    'next.js': 'Next.js',
    vue: 'Vue.js',
    vuejs: 'Vue.js',
    angular: 'Angular',
    django: 'Django',
    flask: 'Flask',
    spring: 'Spring Boot',
    springboot: 'Spring Boot',

    // Databases & Storage
    postgres: 'PostgreSQL',
    postgresql: 'PostgreSQL',
    mongo: 'MongoDB',
    mongodb: 'MongoDB',
    mysql: 'MySQL',
    sqlite: 'SQLite',
    redis: 'Redis',
    dynamodb: 'DynamoDB',

    // Cloud & DevOps
    aws: 'AWS',
    'amazon web services': 'AWS',
    gcp: 'GCP',
    'google cloud': 'GCP',
    azure: 'Azure',
    docker: 'Docker',
    k8s: 'Kubernetes',
    kubernetes: 'Kubernetes',
    terraform: 'Terraform',
    git: 'Git',
    github: 'Git',
    gitlab: 'Git',
    'ci/cd': 'CI/CD',
    cicd: 'CI/CD',

    // AI / ML / Data
    ai: 'AI',
    ml: 'Machine Learning',
    'machine learning': 'Machine Learning',
    dl: 'Deep Learning',
    'deep learning': 'Deep Learning',
    nlp: 'NLP',
    pytorch: 'PyTorch',
    tensorflow: 'TensorFlow',
    scikit: 'Scikit-Learn',
    pandas: 'Pandas',
    numpy: 'NumPy',
    sql: 'SQL',

    // API & Architectures
    rest: 'REST API',
    restful: 'REST API',
    graphql: 'GraphQL',
    grpc: 'gRPC',
    microservices: 'Microservices',
  };

  /**
   * Normalizes a single keyword string to its canonical representation.
   */
  normalizeKeyword(keyword: string): string {
    if (!keyword) return '';
    const cleaned = keyword.trim().toLowerCase();
    return this.synonymMap[cleaned] ?? keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }

  /**
   * Normalizes an array of keywords, removing duplicates and empty strings.
   */
  normalizeKeywords(keywords: string[]): string[] {
    if (!keywords || !Array.isArray(keywords)) return [];
    const normalizedSet = new Set<string>();

    for (const kw of keywords) {
      if (!kw) continue;
      const normalized = this.normalizeKeyword(kw);
      if (normalized) {
        normalizedSet.add(normalized);
      }
    }

    return Array.from(normalizedSet);
  }

  /**
   * Extracts tech keywords from arbitrary unstructured text.
   */
  extractKeywordsFromText(text: string): string[] {
    if (!text) return [];

    const extracted = new Set<string>();
    const lowerText = ` ${text.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, ' ')} `;

    // Check all known keys in synonymMap against the text
    for (const [synonym, canonical] of Object.entries(this.synonymMap)) {
      // Avoid matching sub-words like 'go' in 'good' or 'js' in 'json'
      const pattern = new RegExp(`[\\s,.(:]${this.escapeRegExp(synonym)}[\\s,.:)]`, 'i');
      if (pattern.test(lowerText)) {
        extracted.add(canonical);
      }
    }

    return Array.from(extracted);
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
