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
    // Try multiple ways to get user ID
    let userId = null;
    
    if (req.session && req.session.user && req.session.user.id) {
      userId = req.session.user.id;
    } else if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (req.body && req.body.user_id) {
      userId = req.body.user_id;
    }
    
    if (!userId) {
      // Generate a temporary filename without user ID
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const filename = `temp-profile-${uniqueSuffix}${fileExtension}`;
      console.warn('No user ID found, using temporary filename:', filename);
      return cb(null, filename);
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const filename = `profile-${userId}-${uniqueSuffix}${fileExtension}`;
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

// Create multer instances
const createMulterInstance = (storage, fileFilter, limits) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
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

// Middleware wrapper that handles authentication separately
const handleUpload = (uploadFunction) => {
  return (req, res, next) => {
    // First verify session authentication
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to upload files'
      });
    }

    uploadFunction(req, res, function(err) {
      if (err) {
        console.error('Upload error:', err);
        
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

// Configure storage for deposit proofs
const depositStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/deposits');
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const userId = req.session.user?.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (userId) {
      const filename = `deposit-${userId}-${uniqueSuffix}${fileExtension}`;
      cb(null, filename);
    } else {
      const filename = `deposit-temp-${uniqueSuffix}${fileExtension}`;
      cb(null, filename);
    }
  }
});

// File filter for deposit documents
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images, PDF, and Word documents are allowed.`), false);
  }
};

// Deposit file upload
const uploadDeposit = createMulterInstance(
  depositStorage,
  documentFileFilter,
  {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 1
  }
).single('deposit_proof');

// Add to module.exports
module.exports = {
  uploadProfile: handleUpload(uploadProfile),
  uploadProfileMiddleware: uploadProfile,
  uploadDeposit: handleUpload(uploadDeposit),
  uploadDepositMiddleware: uploadDeposit
};

