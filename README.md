# TEJ Backend - Photo Upload Server

This is the backend server for TEJ's graduation party photo upload system. It handles file uploads and stores them in Google Drive.

## Features

- File upload endpoint for photos
- Google Drive integration for storage
- CORS enabled for frontend communication
- Health check endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create a `.env` file):
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

3. Run the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

- `POST /api/upload-photos` - Upload photos to Google Drive
- `GET /api/health` - Health check endpoint

## Port

The server runs on port 3001 by default. You can change this by setting the `PORT` environment variable.

## Frontend Integration

The frontend should be configured to connect to `http://localhost:3001` for the upload endpoint. # tejBackend
