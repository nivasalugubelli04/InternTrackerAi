import { KeywordNormalizerService } from './keyword-normalizer.service';

describe('KeywordNormalizerService', () => {
  let service: KeywordNormalizerService;

  beforeEach(() => {
    service = new KeywordNormalizerService();
  });

  it('should normalize tech stack synonyms to canonical names', () => {
    expect(service.normalizeKeyword('reactjs')).toBe('React');
    expect(service.normalizeKeyword('react.js')).toBe('React');
    expect(service.normalizeKeyword('js')).toBe('JavaScript');
    expect(service.normalizeKeyword('javascript')).toBe('JavaScript');
    expect(service.normalizeKeyword('nodejs')).toBe('Node.js');
    expect(service.normalizeKeyword('ts')).toBe('TypeScript');
    expect(service.normalizeKeyword('postgres')).toBe('PostgreSQL');
    expect(service.normalizeKeyword('k8s')).toBe('Kubernetes');
  });

  it('should normalize arrays of keywords and deduplicate', () => {
    const raw = ['ReactJS', 'React', 'js', 'JavaScript', 'NodeJS', 'node.js'];
    const result = service.normalizeKeywords(raw);

    expect(result).toEqual(['React', 'JavaScript', 'Node.js']);
  });

  it('should extract tech keywords from unstructured text', () => {
    const text =
      'We are looking for a Software Engineer proficient in React, Node.js, and PostgreSQL with experience in AWS and Docker.';
    const keywords = service.extractKeywordsFromText(text);

    expect(keywords).toContain('React');
    expect(keywords).toContain('Node.js');
    expect(keywords).toContain('PostgreSQL');
    expect(keywords).toContain('AWS');
    expect(keywords).toContain('Docker');
  });
});
