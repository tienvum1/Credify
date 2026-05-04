const pool = require('../config/db').pool;

// Tạo mới một QR
const createQR = async (req, res) => {
  try {
    const { 
      max_amount_per_trans, fee_rate_l1, fee_rate_l2, fee_rate_l3, 
      note, status 
    } = req.body;
    const creator_id = req.user.id;
    
    // fee_rate mặc định lấy từ fee_rate_l1 nếu không có
    const fee_rate = req.body.fee_rate || fee_rate_l1 || 0;
    
    // Khi dùng upload.fields, các file nằm trong req.files
    const main_image = req.files && req.files.main_image ? req.files.main_image[0].path : '';
    const qr_image = req.files && req.files.qr_image ? req.files.qr_image[0].path : '';

    if (!main_image || !qr_image) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ ảnh đại diện và ảnh mã QR' });
    }

    const qrStatus = status || 'ready';

    const [result] = await pool.query(
      'INSERT INTO qrs (main_image, qr_image, max_amount_per_trans, fee_rate, fee_rate_l1, fee_rate_l2, fee_rate_l3, note, status, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        main_image, qr_image, max_amount_per_trans, fee_rate, 
        fee_rate_l1 || 0, fee_rate_l2 || 0, fee_rate_l3 || 0, 
        note, qrStatus, creator_id
      ]
    );

    res.status(201).json({
      message: 'Tạo QR thành công',
      qr: {
        id: result.insertId,
        main_image,
        qr_image,
        max_amount_per_trans,
        fee_rate,
        note,
        status: qrStatus,
        creator_id
      }
    });
  } catch (err) {
    console.error('Lỗi khi tạo QR:', err);
    res.status(500).json({ message: 'Lỗi server khi tạo QR: ' + err.message });
  }
};

// Cập nhật QR
const updateQR = async (req, res) => {
  try {
    const { 
      max_amount_per_trans, fee_rate_l1, fee_rate_l2, fee_rate_l3, 
      note, status 
    } = req.body;
    const qrId = req.params.id;

    // Kiểm tra QR tồn tại
    const [existing] = await pool.query('SELECT * FROM qrs WHERE id = ?', [qrId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });

    let main_image = existing[0].main_image;
    let qr_image = existing[0].qr_image;

    if (req.files) {
      if (req.files.main_image) main_image = req.files.main_image[0].path;
      if (req.files.qr_image) qr_image = req.files.qr_image[0].path;
    }

    const updatedMaxAmount = max_amount_per_trans ?? existing[0].max_amount_per_trans;
    const updatedFeeL1 = fee_rate_l1 ?? existing[0].fee_rate_l1;
    const updatedFeeL2 = fee_rate_l2 ?? existing[0].fee_rate_l2;
    const updatedFeeL3 = fee_rate_l3 ?? existing[0].fee_rate_l3;
    const updatedFeeRate = req.body.fee_rate ?? updatedFeeL1; // Tự động cập nhật fee_rate theo L1
    const updatedNote = note ?? existing[0].note;
    const qrStatus = status || existing[0].status;

    await pool.query(
      'UPDATE qrs SET main_image = ?, qr_image = ?, max_amount_per_trans = ?, fee_rate = ?, fee_rate_l1 = ?, fee_rate_l2 = ?, fee_rate_l3 = ?, note = ?, status = ? WHERE id = ?',
      [
        main_image, qr_image, updatedMaxAmount, updatedFeeRate, 
        updatedFeeL1, updatedFeeL2, updatedFeeL3,
        updatedNote, qrStatus, qrId
      ]
    );

    res.json({ message: 'Cập nhật QR thành công' });
  } catch (err) {
    console.error('Lỗi khi cập nhật QR:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật QR: ' + err.message });
  }
};

// Lấy danh sách QR sẵn sàng cho người dùng
const getReadyQRs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT q.*, u.full_name as creator_name 
      FROM qrs q 
      JOIN users u ON q.creator_id = u.id 
      WHERE q.status = 'ready'
      ORDER BY q.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách QR sẵn sàng' });
  }
};

// Lấy chi tiết QR sẵn sàng cho người dùng
const getReadyQRById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT q.*, u.full_name as creator_name
        FROM qrs q
        JOIN users u ON q.creator_id = u.id
        WHERE q.id = ? AND q.status = 'ready'
        LIMIT 1
      `,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy chi tiết QR' });
  }
};

// Cập nhật trạng thái QR (staff)
const updateQRStatus = async (req, res) => {
  try {
    const qrId = req.params.id;
    const { status } = req.body;

    if (status !== 'ready' && status !== 'maintenance') {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const [existing] = await pool.query('SELECT id FROM qrs WHERE id = ?', [qrId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });

    await pool.query('UPDATE qrs SET status = ? WHERE id = ?', [status, qrId]);
    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái' });
  }
};

// Xóa QR
const deleteQR = async (req, res) => {
  try {
    const qrId = req.params.id;
    const [result] = await pool.query('DELETE FROM qrs WHERE id = ?', [qrId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy QR để xóa' });
    }

    res.json({ message: 'Xóa QR thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi xóa QR' });
  }
};

// Lấy danh sách QR (có thể filter theo người tạo)
const getAllQRs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT q.*, u.full_name as creator_name 
      FROM qrs q 
      JOIN users u ON q.creator_id = u.id 
      ORDER BY q.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách QR' });
  }
};

// Lấy chi tiết 1 QR
const getQRById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM qrs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  createQR,
  updateQR,
  getReadyQRs,
  getReadyQRById,
  updateQRStatus,
  deleteQR,
  getAllQRs,
  getQRById
};
