# API Key System Documentation

## Overview

The BAAS (Backend as a Service) platform now includes a comprehensive API key management and usage tracking system. This allows users to generate API keys for their projects and track usage analytics.

## Features

- ✅ **API Key Generation**: Create secure API keys for projects
- ✅ **Permission-based Access**: Control what each API key can access
- ✅ **Usage Tracking**: Monitor API calls, response times, and errors
- ✅ **Analytics Dashboard**: View detailed usage statistics
- ✅ **Project Isolation**: Each API key is tied to a specific project

## Database Schema

### Projects Collection

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  owner: ObjectId (ref: User),
  startDate: Date,
  addAuth: Boolean,
  connectDatabase: Boolean,
  manageApis: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### ApiKeys Collection

```javascript
{
  _id: ObjectId,
  projectId: ObjectId (ref: Project),
  key: String (unique), // pk_live_abc123...
  name: String,
  description: String,
  permissions: [String], // ["auth", "database", "storage"]
  isActive: Boolean,
  lastUsed: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### UsageLogs Collection

```javascript
{
  _id: ObjectId,
  apiKeyId: ObjectId (ref: ApiKey),
  projectId: ObjectId (ref: Project),
  endpoint: String,
  method: String,
  statusCode: Number,
  responseTime: Number, // milliseconds
  timestamp: Date,
  metadata: {
    userAgent: String,
    ip: String,
    errorMessage: String,
    requestSize: Number,
    responseSize: Number
  }
}
```

## API Endpoints

### Project Management

#### Create Project

```http
POST /projects
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "My Blog App",
  "description": "Personal blog backend",
  "startDate": "2024-01-15T00:00:00.000Z",
  "addAuth": true,
  "connectDatabase": true,
  "manageApis": true
}
```

#### Get Projects

```http
GET /projects
Authorization: Bearer <JWT_TOKEN>
```

### API Key Management

#### Generate API Key

```http
POST /api-keys/generate
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "projectId": "project_id_here",
  "name": "Production Key",
  "description": "Main API key for production",
  "permissions": ["auth", "database", "storage"]
}
```

Response:

```json
{
  "message": "API key generated successfully",
  "apiKey": {
    "_id": "key_id",
    "projectId": "project_id",
    "key": "pk_live_abc123...", // Full key shown only once
    "name": "Production Key",
    "description": "Main API key for production",
    "permissions": ["auth", "database", "storage"],
    "isActive": true,
    "lastUsed": null,
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "warning": "Save this API key securely. You won't be able to see it again."
}
```

#### List API Keys for Project

```http
GET /api-keys/project/{projectId}
Authorization: Bearer <JWT_TOKEN>
```

#### Update API Key

```http
PUT /api-keys/{keyId}
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Updated Key Name",
  "description": "Updated description",
  "permissions": ["auth", "database"],
  "isActive": true
}
```

#### Delete API Key

```http
DELETE /api-keys/{keyId}
Authorization: Bearer <JWT_TOKEN>
```

### Usage Analytics

#### Get Usage Statistics

```http
GET /usage/stats/{projectId}?period=30d&limit=10
Authorization: Bearer <JWT_TOKEN>
```

Response:

```json
{
  "message": "Usage statistics retrieved successfully",
  "period": "30d",
  "project": {
    "id": "project_id",
    "name": "My Blog App"
  },
  "stats": {
    "totalCalls": 15420,
    "todayCalls": 234,
    "errorRate": "2.5",
    "avgResponseTime": 145,
    "topEndpoints": [
      {
        "_id": "/api/auth/login",
        "count": 8500,
        "avgResponseTime": 120,
        "errorCount": 50
      }
    ],
    "statusCodeStats": [
      { "_id": 200, "count": 15000 },
      { "_id": 400, "count": 200 },
      { "_id": 500, "count": 20 }
    ],
    "recentActivity": [...]
  }
}
```

#### Get Usage Analytics (Charts Data)

```http
GET /usage/analytics/{projectId}?days=30
Authorization: Bearer <JWT_TOKEN>
```

#### Get API Key Usage

```http
GET /usage/keys/{keyId}?period=30d
Authorization: Bearer <JWT_TOKEN>
```

### Public API Endpoints (Require API Key)

#### API Information

```http
GET /api/info
X-API-Key: pk_live_abc123...
```

#### Authentication Endpoints

```http
POST /api/auth/signup
X-API-Key: pk_live_abc123...
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

```http
POST /api/auth/login
X-API-Key: pk_live_abc123...
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Database Endpoints

```http
GET /api/db/query?table=users&limit=10
X-API-Key: pk_live_abc123...
```

```http
POST /api/db/insert
X-API-Key: pk_live_abc123...
Content-Type: application/json

{
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Storage Endpoints

```http
POST /api/storage/upload
X-API-Key: pk_live_abc123...
Content-Type: application/json

{
  "filename": "document.pdf",
  "content": "base64_encoded_content"
}
```

## Usage Flow

1. **Create Project**: User creates a project through the dashboard
2. **Generate API Key**: User generates an API key for the project
3. **Use API**: Developer uses the API key in their applications
4. **Track Usage**: System automatically logs all API calls
5. **View Analytics**: User can view usage statistics in the dashboard

## Security Features

- **Secure Key Generation**: Uses cryptographically secure random bytes
- **Key Masking**: Full keys are never exposed after creation
- **Permission System**: Granular control over API access
- **Rate Limiting**: Built-in protection against abuse
- **Usage Logging**: Complete audit trail of all API calls

## Best Practices

1. **Key Storage**: Store API keys securely, never in client-side code
2. **Key Rotation**: Regularly rotate API keys for security
3. **Permission Principle**: Use minimal required permissions
4. **Monitoring**: Regularly check usage analytics for anomalies
5. **Error Handling**: Implement proper error handling for API key failures

## Error Responses

### Invalid API Key

```json
{
  "error": "Invalid or inactive API key",
  "message": "The provided API key is not valid or has been deactivated"
}
```

### Insufficient Permissions

```json
{
  "error": "Insufficient permissions",
  "message": "This API key requires the following permissions: auth, database",
  "required": ["auth", "database"],
  "current": ["auth"]
}
```

### Missing API Key

```json
{
  "error": "API key required",
  "message": "Please provide an API key in the x-api-key header"
}
```

## Development Setup

1. **Install Dependencies**: All required packages are already installed
2. **Environment Variables**: No additional environment variables needed
3. **Database**: MongoDB collections will be created automatically
4. **Testing**: Use the example API endpoints to test the system

## Monitoring and Maintenance

- **Log Retention**: Usage logs are automatically deleted after 90 days
- **Performance**: Indexes are optimized for fast queries
- **Scaling**: System is designed to handle high-volume usage
- **Backup**: Regular database backups recommended for production
