# Launch / Release Checklist

## Infrastructure
- [ ] AWS RDS instances provisioned (Multi-AZ).
- [ ] Redis ElastiCache provisioned.
- [ ] ECS Services configured with correct `node_modules` and task sizes.
- [ ] AWS Secrets Manager populated with production keys.

## Security
- [ ] `BCRYPT_ROUNDS` set to at least 12.
- [ ] Strong JWT Access and Refresh Secrets set.
- [ ] Admin Dashboard secured behind strong passwords.
- [ ] Security Groups restrict DB/Redis access to ECS tasks only.

## AI & APIs
- [ ] Gemini API key verified and quotas checked.
- [ ] SendGrid API key verified and domain authenticated.

## Application State
- [ ] Feature Flags properly configured in DB.
- [ ] Base set of Skills imported into DB.
- [ ] Initial set of Companies seeded for scraping.

## Frontend
- [ ] Admin App built and deployed to CDN (CloudFront).
- [ ] Mobile App submitted to App Store Connect and Google Play Console.
