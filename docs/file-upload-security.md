# File Upload Security

## Validation Flow
1. Files uploaded directly are validated via `UploadResumeDto` to enforce a 5MB size limit.
2. The `fileUrl` property expects an external storage link.
3. To prevent SSRF (Server Side Request Forgery) attacks where a user passes a URL pointing to internal microservices, the `@IsSafeUrl()` class validator enforces a strict allowlist of routable internet IPs and blocks common private CIDRs and loopback addresses.

## Allowed MIME Types
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
