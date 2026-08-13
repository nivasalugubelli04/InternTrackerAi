import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string) {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname || '';

      if (!hostname) return false;

      // Block common internal/local hostnames and cloud metadata endpoints
      const blockedHostnames = ['localhost', '127.0.0.1', '::1', '169.254.169.254', '0.0.0.0'];
      if (blockedHostnames.includes(hostname)) return false;

      // Block 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
      const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const octet1 = parseInt(match[1] as string, 10);
        const octet2 = parseInt(match[2] as string, 10);

        if (octet1 === 10) return false;
        if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
        if (octet1 === 192 && octet2 === 168) return false;
        if (octet1 === 127) return false; // Any 127.x.x.x
      }
      return true;
    } catch {
      return false; // Invalid URL
    }
  }

  defaultMessage() {
    return 'URL must be a valid, publicly routable address.';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}
