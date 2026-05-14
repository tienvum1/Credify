const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'the-tin-dung-qrs',
    // Cho phép tất cả định dạng ảnh để tránh lỗi trên các dòng máy khác nhau
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'heic', 'heif', 'gif', 'bmp'],
    transformation: [{ quality: 'auto:best', fetch_format: 'auto' }]
  }
});

module.exports = { cloudinary, storage };
