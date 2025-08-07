# Security Configuration

This document describes the security measures implemented in Leelo.

## Security Headers

Leelo uses `@fastify/helmet` to implement comprehensive security headers. The configuration is environment-aware and automatically adjusts based on the `NODE_ENV` setting.

### Headers Implemented

#### Content Security Policy (CSP)
- **Purpose**: Prevents XSS attacks and controls resource loading
- **Configuration**: 
  - Allows inline styles and scripts for React SPA functionality
  - Permits external fonts from Google Fonts
  - Allows external images for article content
  - Enables YouTube embeds for video content
  - Blocks object/embed tags for security

#### Cross-Origin Policies
- **Cross-Origin Embedder Policy**: Disabled for development compatibility
- **Cross-Origin Opener Policy**: Set to `same-origin` for security
- **Cross-Origin Resource Policy**: Set to `cross-origin` for fonts and assets

#### Frame Protection
- **Frameguard**: Set to `deny` to prevent clickjacking attacks
- **X-Frame-Options**: Automatically set by helmet

#### HTTPS Enforcement
- **HSTS**: Enabled in production only
  - Max age: 1 year
  - Includes subdomains
  - Preload enabled

#### Information Disclosure Prevention
- **Hide Powered-By**: Removes `X-Powered-By` header
- **NoSniff**: Prevents MIME type sniffing
- **XSS Protection**: Enables browser XSS filter

#### Browser Feature Restrictions
- **Permissions Policy**: Restricts potentially dangerous browser features:
  - Camera: `none`
  - Microphone: `none`
  - Geolocation: `none`
  - Payment: `none`
  - USB: `none`
  - Sensors: `none`
  - Allows: autoplay, fullscreen, picture-in-picture

#### Referrer Policy
- **Policy**: `strict-origin-when-cross-origin`
- **Purpose**: Controls referrer information sent to external sites

## CORS Configuration

### Development
- **Origins**: `http://localhost:3000`, `http://127.0.0.1:3000`
- **Credentials**: Enabled
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS

### Production
- **Origins**: Configured via `ALLOWED_ORIGINS` environment variable
- **Default**: `https://yourdomain.com`
- **Credentials**: Enabled
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS

## Environment Variables

### Required for Production
```bash
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Optional
```bash
# Additional security configurations
SECURITY_HEADERS_ENABLED=true
CSP_REPORT_URI=https://yourdomain.com/csp-report
```

## Security Best Practices

### 1. JWT Secret
- Use a strong, random secret
- Never commit secrets to version control
- Rotate secrets regularly

### 2. CORS Configuration
- Only allow necessary origins
- Avoid using `*` in production
- Regularly review and update allowed origins

### 3. Content Security Policy
- Monitor CSP violations in production
- Adjust policy based on application needs
- Consider implementing CSP reporting

### 4. HTTPS
- Always use HTTPS in production
- Configure proper SSL/TLS certificates
- Enable HSTS for additional security

### 5. Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Regularly audit security configuration

## Monitoring and Logging

### Security Events
- Failed authentication attempts
- CSP violations
- CORS violations
- Rate limiting events

### Recommended Tools
- Security monitoring tools
- CSP violation reporting
- Regular security audits
- Dependency vulnerability scanning

## Troubleshooting

### Common Issues

#### CSP Violations
If you encounter CSP violations:
1. Check browser console for specific violations
2. Adjust CSP directives in `src/server/config/security.ts`
3. Test changes in development first

#### CORS Errors
If you encounter CORS errors:
1. Verify `ALLOWED_ORIGINS` configuration
2. Check that credentials are properly configured
3. Ensure proper preflight handling

#### HSTS Issues
If HSTS causes issues:
1. Verify HTTPS is properly configured
2. Check certificate validity
3. Consider reducing HSTS max-age during testing

## Additional Security Measures

### Rate Limiting
Consider implementing rate limiting for:
- Authentication endpoints
- API endpoints
- File upload endpoints

### Input Validation
- All inputs are validated using Zod schemas
- SQL injection is prevented by using Prisma ORM
- File uploads are validated for type and size

### Authentication
- JWT-based authentication
- TOTP support for 2FA
- Passkey support for modern authentication
- OIDC integration for enterprise environments

### Data Protection
- User data is isolated by user ID
- Sensitive data is hashed (passwords)
- Database connections use parameterized queries
