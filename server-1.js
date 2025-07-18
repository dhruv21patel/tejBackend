/**
 * This server exposes an API endpoint to accept file uploads (images)
 * and uploads them to Google Drive using OAuth2 authentication.
 * 
 * - POST /api/upload-photos: Accepts multipart/form-data with files (field: 'photos')
 * - Files are uploaded to a specific Google Drive folder using OAuth2 credentials
 * - Health check endpoint at /api/health
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS setup: allow all origins for development/testing
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Multer setup: store uploads in 'uploads/' folder, only allow images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Google OAuth2 credentials (should be set in environment variables for production)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ;
let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

// Google OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Helper to get Google Drive client with credentials
function getDriveClient() {
  if (!refreshToken) {
    throw new Error('No refresh token available. Please authenticate first.');
  }
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oAuth2Client });
}

// Upload files to Google Drive (returns array of upload results)
async function uploadToGoogleDrive(files) {
  if (!files || files.length === 0) return [];
  const drive = getDriveClient();
  const uploaded = [];
  for (const file of files) {
    try {
      // You can change the 'parents' value to your target Google Drive folder ID
      const fileMetadata = {
        name: file.originalname,
        mimeType: file.mimetype,
        parents: ['1Kop91GnH3jWtHv8T9z0D0jKuQ_NsXNGU']
      };
      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      };
      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, size',
      });
      uploaded.push({
        id: response.data.id,
        name: response.data.name,
        link: response.data.webViewLink,
        size: response.data.size,
        status: 'success',
        message: 'File uploaded to Google Drive successfully'
      });
      // Remove local file after upload
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Error deleting ${file.originalname}:`, err);
      });
    } catch (error) {
      uploaded.push({
        name: file.originalname,
        status: 'failed',
        error: error.message
      });
    }
  }
  return uploaded;
}

// API endpoint: upload photos and send to Google Drive
app.post('/api/upload-photos', upload.array('photos'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const uploadResults = await uploadToGoogleDrive(req.files);
    const successfulUploads = uploadResults.filter(result => result.status === 'success').length;
    const totalUploads = uploadResults.length;
    res.json({
      message: `Successfully processed ${successfulUploads} out of ${totalUploads} files!`,
      files: uploadResults,
      summary: {
        total: totalUploads,
        successful: successfulUploads,
        failed: totalUploads - successfulUploads
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Upload failed',
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    googleDrive: {
      configured: !!refreshToken,
      clientId: CLIENT_ID ? 'Set' : 'Not set',
      clientSecret: CLIENT_SECRET ? 'Set' : 'Not set'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload-photos`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});