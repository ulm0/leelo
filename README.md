# Leelo - A Self-Hosted Read-It-Whenever PWA

A modern, self-hosted read-it-whenever application with a unified backend and frontend architecture. Save articles, organize them with tags, and read them in a clean, distraction-free interface.

## Features

- 📚 **Article Management**: Save articles from URLs with automatic content extraction
- 🏷️ **Tagging System**: Organize articles with custom tags and colors
- 📱 **PWA Support**: Progressive Web App with offline capabilities
- 🔐 **Authentication**: JWT-based authentication with OIDC support
- 👥 **User Management**: Multi-user support with admin controls
- 🎨 **Customization**: Reading font preferences including dyslexia-friendly options
- 📧 **Email Integration**: Invitation system with email notifications
- 🎥 **Video Support**: Embedded video playback for supported platforms
- 🔧 **Admin Dashboard**: Comprehensive administration interface

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ulm0/leelo.git
   cd leelo
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Open http://localhost:3000
   - Default admin credentials: `admin` / `admin`

### Manual Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup database**
   ```bash
   npm run db:setup
   ```

3. **Build the application**
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## Development

### Prerequisites
- Node.js 20+
- npm or yarn
- SQLite (for development)

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Database operations
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run migrations
npm run db:generate  # Generate Prisma client
```

## Production Deployment

### Docker

The application includes a multi-stage Dockerfile optimized for production:

```bash
# Build the image
docker build -t leelo:latest .

# Run with docker-compose
docker-compose up -d
```

### Kubernetes with Helm

#### Production Deployment with PVC
```bash
helm install leelo ./helm/leelo \
  --namespace leelo \
  --create-namespace \
  --set persistence.type=pvc \
  --set persistence.pvc.size=5Gi \
  --set persistence.pvc.storageClass=fast-ssd \
  --set env.JWT_SECRET=your-production-secret \
  --set env.BASE_URL=https://leelo.yourdomain.com \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=leelo.yourdomain.com
```

#### Development with HostPath
```bash
helm install leelo-dev ./helm/leelo \
  --namespace leelo-dev \
  --create-namespace \
  --set persistence.type=hostPath \
  --set persistence.hostPath.path=/tmp/leelo-dev \
  --set env.JWT_SECRET=dev-secret
```

#### Testing with EmptyDir
```bash
helm install leelo-test ./helm/leelo \
  --namespace leelo-test \
  --create-namespace \
  --set persistence.type=emptyDir \
  --set env.JWT_SECRET=test-secret
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | Database connection string | `file:/data/leelo.db` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key` |
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_PASSWORD` | Default admin password | `admin` |
| `BASE_URL` | Application base URL | `http://localhost:3000` |
| `ASSETS_PATH` | Path for user assets | `/data/assets` |
| `FONTS_PATH` | Path for custom fonts | `/data/fonts` |

## CI/CD Pipeline

The project includes a GitHub Actions workflow for automated CI/CD:

- **Testing**: Runs linting and build checks on pull requests
- **Build**: Creates Docker images on push to main/develop
- **Deploy**: Automatic deployment to staging/production environments
- **Releases**: Creates GitHub releases for tagged versions

### GitHub Container Registry

Images are automatically pushed to GitHub Container Registry:
```
ghcr.io/ulm0/leelo:latest
ghcr.io/ulm0/leelo:main
ghcr.io/ulm0/leelo:v1.0.0
```

## Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **Shadcn/ui** for UI components
- **React Query** for data fetching
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **Fastify** web framework
- **Prisma** ORM with SQLite
- **JWT** authentication
- **OIDC** integration
- **Nodemailer** for email notifications
- **Sharp** for image processing

### Database
- **SQLite** for data storage
- **Prisma Migrations** for schema management
- **Better Queue** for background job processing

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Articles
- `GET /api/articles` - List articles
- `POST /api/articles` - Add new article
- `GET /api/articles/:id` - Get article details
- `PATCH /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article

### Admin
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/admin/invitations` - List invitations
- `POST /api/admin/invitations` - Create invitation

### Health
- `GET /health` - Basic health check
- `GET /api/health` - Detailed health check with database status

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/ulm0/leelo/wiki)
- 🐛 [Issue Tracker](https://github.com/ulm0/leelo/issues)
- 💬 [Discussions](https://github.com/ulm0/leelo/discussions)