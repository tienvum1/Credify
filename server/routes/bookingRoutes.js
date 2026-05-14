const express = require("express");
const router = express.Router();
const multer = require("multer");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { storage } = require("../config/cloudinary");
const {
  createBooking,
  submitCustomerPaid,
  getMyBookings,
  getMyBookingDetail,
  staffGetBookings,
  staffGetBookingDetail,
  staffConfirmBooking,
  staffRejectBooking,
  getStaffStats,
  claimBooking,
  updateBookingValidity,
  accountantGetBookings,
  accountantGetBookingDetail,
  accountantConfirmPaid,
} = require("../controllers/bookingController");

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // Tăng lên 20MB mỗi file để tránh lỗi trên điện thoại
});

router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.get("/my/:id", protect, getMyBookingDetail);
router.post(
  "/:id/customer-paid",
  protect,
  upload.fields([
    { name: 'proof', maxCount: 10 },
    { name: 'id_card', maxCount: 2 }
  ]),
  submitCustomerPaid
);

router.get("/staff", protect, authorize("staff", "admin_system"), staffGetBookings);
router.get("/staff/stats", protect, authorize("staff", "admin_system"), getStaffStats);
router.get("/staff/:id", protect, authorize("staff", "admin_system"), staffGetBookingDetail);
router.patch("/:id/validity", protect, authorize("admin_system", "accountant"), updateBookingValidity);
router.patch("/:id/claim", protect, authorize("staff", "admin_system"), claimBooking);
router.patch(
  "/:id/confirm",
  protect,
  authorize("staff", "admin_system"),
  upload.array("proof", 3),
  staffConfirmBooking
);
router.patch("/:id/reject", protect, authorize("staff", "admin_system", "accountant"), staffRejectBooking);

// Routes dành cho Kế toán
router.get("/accountant/list", protect, authorize("accountant", "admin_system"), accountantGetBookings);
router.get("/accountant/:id", protect, authorize("accountant", "admin_system"), accountantGetBookingDetail);
router.post("/accountant/:id/confirm", protect, authorize("accountant"), upload.array("proof", 3), accountantConfirmPaid);

module.exports = router;
