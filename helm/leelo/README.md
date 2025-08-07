# Leelo Helm Chart

A Helm chart for deploying Leelo - A Self-Hosted Read-It-Later PWA on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PV provisioner support in the underlying infrastructure (if using PVC)

## Installing the Chart

### Basic Installation

```bash
helm install leelo ./helm/leelo \
  --namespace leelo \
  --create-namespace
```

### With Custom Values

```bash
helm install leelo ./helm/leelo \
  --namespace leelo \
  --create-namespace \
  --values custom-values.yaml
```

### Using Example Configurations

The chart includes several example configurations:

#### Development/Testing
```bash
helm install leelo ./helm/leelo \
  --namespace leelo \
  --create-namespace \
  --values helm/leelo/examples/testing-values.yaml
```

#### Production
```bash
helm install leelo ./helm/leelo \
  --namespace leelo \
  --create-namespace \
  --values helm/leelo/examples/production-values.yaml
```

#### Rolling Update (Zero Downtime)
```bash
helm install leelo ./helm/leelo \
  --namespace leelo \
  --create-namespace \
  --values helm/leelo/examples/rolling-update-values.yaml
```

## Configuration

### Persistence Options

The chart supports three types of persistence:

#### 1. PVC (PersistentVolumeClaim) - Default

```yaml
persistence:
  enabled: true
  type: "pvc"
  pvc:
    storageClass: "fast-ssd"
    accessMode: ReadWriteOnce
    size: 5Gi
```

#### 2. HostPath

```yaml
persistence:
  enabled: true
  type: "hostPath"
  hostPath:
    path: "/mnt/data/leelo"
    type: "DirectoryOrCreate"
```

#### 3. EmptyDir (for testing only)

```yaml
persistence:
  enabled: true
  type: "emptyDir"
  emptyDir: {}
```

### Environment Variables

```yaml
env:
  NODE_ENV: production
  DATABASE_URL: file:/data/leelo.db
  JWT_SECRET: your-super-secret-jwt-key
  ADMIN_USERNAME: admin
  ADMIN_PASSWORD: admin
  BASE_URL: https://leelo.yourdomain.com
```

### Deployment Strategy

The chart supports different deployment strategies:

#### 1. Recreate (Default) - Recommended for single-instance deployments

```yaml
deployment:
  strategy:
    type: "Recreate"
```

This strategy terminates the old pod before creating a new one, which is ideal for applications that cannot handle multiple instances simultaneously.

#### 2. RollingUpdate - For zero-downtime deployments

```yaml
deployment:
  strategy:
    type: "RollingUpdate"
    rollingUpdate:
      maxSurge: "25%"
      maxUnavailable: "0%" # Ensures zero downtime
```

This strategy gradually replaces old pods with new ones, allowing for zero-downtime deployments.

### Ingress Configuration

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: leelo.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: leelo-tls
      hosts:
        - leelo.yourdomain.com
```

**Note**: The ingress template supports both `networking.k8s.io/v1` (Kubernetes 1.19+) and `networking.k8s.io/v1beta1` (Kubernetes 1.14+) API versions.

### Resource Limits

```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

## Examples

### Production Deployment with PVC

```bash
helm install leelo ./helm/leelo \
  --namespace leelo \
  --create-namespace \
  --set persistence.type=pvc \
  --set persistence.pvc.size=10Gi \
  --set persistence.pvc.storageClass=fast-ssd \
  --set env.JWT_SECRET=your-production-secret \
  --set env.BASE_URL=https://leelo.yourdomain.com \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=leelo.yourdomain.com
```

### Development with HostPath

```bash
helm install leelo-dev ./helm/leelo \
  --namespace leelo-dev \
  --create-namespace \
  --set persistence.type=hostPath \
  --set persistence.hostPath.path=/tmp/leelo-dev \
  --set env.NODE_ENV=development \
  --set env.JWT_SECRET=dev-secret
```

### Testing with EmptyDir

```bash
helm install leelo-test ./helm/leelo \
  --namespace leelo-test \
  --create-namespace \
  --set persistence.type=emptyDir \
  --set env.JWT_SECRET=test-secret
```

## Upgrading

```bash
helm upgrade leelo ./helm/leelo \
  --namespace leelo \
  --reuse-values
```

## Uninstalling

```bash
helm uninstall leelo --namespace leelo
```

**Note**: This will not delete the PVC. To delete the PVC as well:

```bash
kubectl delete pvc leelo-data --namespace leelo
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n leelo
kubectl describe pod <pod-name> -n leelo
```

### Check Logs

```bash
kubectl logs -f deployment/leelo -n leelo
```

### Check PVC Status

```bash
kubectl get pvc -n leelo
kubectl describe pvc leelo-data -n leelo
```

### Health Check

```bash
kubectl port-forward svc/leelo 3000:80 -n leelo
curl http://localhost:3000/api/health
```

## Values Reference

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Container image repository | `ghcr.io/ulm0/leelo` |
| `image.tag` | Container image tag | `""` (uses Chart.AppVersion) |
| `image.pullPolicy` | Container image pull policy | `IfNotPresent` |
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.type` | Persistence type: pvc, hostPath, emptyDir | `pvc` |
| `persistence.pvc.storageClass` | Storage class for PVC | `""` |
| `persistence.pvc.accessMode` | Access mode for PVC | `ReadWriteOnce` |
| `persistence.pvc.size` | Size for PVC | `1Gi` |
| `persistence.hostPath.path` | Host path for hostPath | `"/data/leelo"` |
| `persistence.hostPath.type` | Host path type | `DirectoryOrCreate` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.hosts` | Ingress hosts configuration | `[]` |
| `ingress.tls` | Ingress TLS configuration | `[]` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` | 