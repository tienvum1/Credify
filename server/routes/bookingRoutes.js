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
} = require("../controllers/bookingController");

const upload = multer({ storage });

router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.get("/my/:id", protect, getMyBookingDetail);
router.post(
  "/:id/customer-paid",
  protect,
  upload.array("proof", 3),
  submitCustomerPaid
);

router.get("/staff", protect, authorize("staff"), staffGetBookings);
router.get("/staff/stats", protect, authorize("staff"), getStaffStats);
router.get("/staff/:id", protect, authorize("staff"), staffGetBookingDetail);
router.patch("/:id/claim", protect, authorize("staff"), claimBooking);
router.patch(
  "/:id/confirm",
  protect,
  authorize("staff"),
  upload.array("proof", 3),
  staffConfirmBooking
);
router.patch("/:id/reject", protect, authorize("staff"), staffRejectBooking);

module.exports = router;
