// config/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const uploadDirs = [
    path.join(__dirname, '../public/uploads/profiles'),
    path.join(__dirname, '../public/uploads/qrcodes'),
    path.join(__dirname, '../public/uploads/documents')
  ];

  for (const dir of uploadDirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`Created upload directory: ${dir}`);
    }
  }
};

// Initialize directories on startup
ensureUploadDirs().catch(console.error);

// Configure storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/profiles');
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    if (!req.user || !req.user.id) {
      return cb(new Error('User not authenticated'), null);
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const filename = `profile-${req.user.id}-${uniqueSuffix}${fileExtension}`;
    cb(null, filename);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/bmp',
    'image/gif',
    'image/svg+xml'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, BMP, GIF, and SVG are allowed.`), false);
  }
};

// Create multer instances with better error handling
const createMulterInstance = (storage, fileFilter, limits) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits,
    onError: function(err, next) {
      console.error('Multer error:', err);
      next(err);
    }
  });
};

// Profile picture upload
const uploadProfile = createMulterInstance(
  profileStorage,
  imageFileFilter,
  {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
).single('profile_picture');

// QR code upload (if needed)
const qrStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/qrcodes');
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `qrcode-${req.user.id}-${uniqueSuffix}.jpg`;
    cb(null, filename);
  }
});

const uploadQR = createMulterInstance(
  qrStorage,
  imageFileFilter,
  {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
).single('qr_code');

// Middleware wrapper for better error handling
const handleUpload = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, function(err) {
      if (err) {
        console.error('Upload error:', err);
        
        // Handle different types of errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File too large. Please upload a file smaller than 5MB.'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              message: 'Too many files. Please upload only one file.'
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          message: err.message || 'Upload failed'
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadProfile: handleUpload(uploadProfile),
  uploadQR: handleUpload(uploadQR),
  uploadProfileMiddleware: uploadProfile,
  uploadQRMiddleware: uploadQR
};