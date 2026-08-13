import { IsSafeUrlConstraint } from './is-safe-url.validator';

describe('IsSafeUrlConstraint', () => {
  let validator: IsSafeUrlConstraint;

  beforeEach(() => {
    validator = new IsSafeUrlConstraint();
  });

  it('should allow valid public URLs', () => {
    expect(validator.validate('https://www.google.com')).toBe(true);
    expect(validator.validate('http://example.com/path')).toBe(true);
    expect(validator.validate('https://1.1.1.1')).toBe(true);
  });

  it('should block localhost and private IPs', () => {
    expect(validator.validate('http://localhost:3000')).toBe(false);
    expect(validator.validate('http://127.0.0.1')).toBe(false);
    expect(validator.validate('http://10.0.0.1/admin')).toBe(false);
    expect(validator.validate('https://172.16.0.5')).toBe(false);
    expect(validator.validate('http://192.168.1.100')).toBe(false);
  });

  it('should block cloud metadata endpoint', () => {
    expect(validator.validate('http://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('should handle invalid urls gracefully', () => {
    expect(validator.validate('not-a-url')).toBe(false);
    expect(validator.validate('')).toBe(false);
    expect(validator.validate(null as unknown as string)).toBe(false);
  });
});
