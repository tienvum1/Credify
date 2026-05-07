const pool = require('../config/db').pool;
const { cloudinary } = require('../config/cloudinary');

// Hàm helper để xóa ảnh trên Cloudinary từ URL
const deleteCloudinaryImage = async (url) => {
  if (!url) return;
  try {
    // URL Cloudinary có dạng: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/public_id.jpg
    const parts = url.split('/');
    const folderAndPublicId = parts.slice(-2).join('/').split('.')[0]; // Lấy 'folder/public_id'
    await cloudinary.uploader.destroy(folderAndPublicId);
    console.log('Đã xóa ảnh cũ trên Cloudinary:', folderAndPublicId);
  } catch (err) {
    console.error('Lỗi khi xóa ảnh trên Cloudinary:', err.message);
  }
};

// Tạo mới một QR
const createQR = async (req, res) => {
  try {
    const { 
      name, max_amount_per_trans, fee_rate, fee_rate_l1, fee_rate_l2, fee_rate_l3, 
      note, status 
    } = req.body;
    const creator_id = req.user.id;
    
    const main_image = req.files && req.files.main_image ? req.files.main_image[0].path : '';
    const qr_image = req.files && req.files.qr_image ? req.files.qr_image[0].path : '';

    if (!main_image || !qr_image) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ ảnh đại diện và ảnh mã QR' });
    }

    const qrStatus = status || 'ready';

    const [result] = await pool.query(
      'INSERT INTO qrs (name, main_image, qr_image, max_amount_per_trans, fee_rate, fee_rate_l1, fee_rate_l2, fee_rate_l3, note, status, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name || null, main_image, qr_image, max_amount_per_trans, 
        fee_rate || 0, fee_rate_l1 || 0, fee_rate_l2 || 0, fee_rate_l3 || 0, 
        note, qrStatus, creator_id
      ]
    );

    res.status(201).json({
      message: 'Tạo QR thành công',
      qr: {
        id: result.insertId,
        name: name || null,
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
      name, max_amount_per_trans, fee_rate, fee_rate_l1, fee_rate_l2, fee_rate_l3, 
      note, status 
    } = req.body;
    const qrId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM qrs WHERE id = ?', [qrId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });

    let main_image = existing[0].main_image;
    let qr_image = existing[0].qr_image;

    if (req.files) {
      if (req.files.main_image) {
        await deleteCloudinaryImage(existing[0].main_image);
        main_image = req.files.main_image[0].path;
      }
      if (req.files.qr_image) {
        await deleteCloudinaryImage(existing[0].qr_image);
        qr_image = req.files.qr_image[0].path;
      }
    }

    const updatedName = name !== undefined ? name : existing[0].name;
    const updatedMaxAmount = max_amount_per_trans ?? existing[0].max_amount_per_trans;
    const updatedFeeDefault = fee_rate ?? existing[0].fee_rate;
    const updatedFeeL1 = fee_rate_l1 ?? existing[0].fee_rate_l1;
    const updatedFeeL2 = fee_rate_l2 ?? existing[0].fee_rate_l2;
    const updatedFeeL3 = fee_rate_l3 ?? existing[0].fee_rate_l3;
    const updatedNote = note ?? existing[0].note;
    const qrStatus = status || existing[0].status;

    await pool.query(
      'UPDATE qrs SET name = ?, main_image = ?, qr_image = ?, max_amount_per_trans = ?, fee_rate = ?, fee_rate_l1 = ?, fee_rate_l2 = ?, fee_rate_l3 = ?, note = ?, status = ? WHERE id = ?',
      [
        updatedName, main_image, qr_image, updatedMaxAmount, 
        updatedFeeDefault, updatedFeeL1, updatedFeeL2, updatedFeeL3,
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

// Toggle quyền sửa QR cho accountant (chỉ admin/staff)
const toggleAccountantEditable = async (req, res) => {
  try {
    const qrId = req.params.id;
    const [existing] = await pool.query('SELECT id, accountant_editable FROM qrs WHERE id = ?', [qrId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });

    const newValue = existing[0].accountant_editable ? 0 : 1;
    await pool.query('UPDATE qrs SET accountant_editable = ? WHERE id = ?', [newValue, qrId]);
    res.json({ message: newValue ? 'Đã bật quyền sửa cho kế toán' : 'Đã tắt quyền sửa cho kế toán', accountant_editable: newValue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Accountant cập nhật QR (chỉ khi accountant_editable = 1)
const accountantUpdateQR = async (req, res) => {
  try {
    const qrId = req.params.id;
    const { name, max_amount_per_trans, fee_rate, fee_rate_l1, fee_rate_l2, fee_rate_l3, note } = req.body;

    const [existing] = await pool.query('SELECT * FROM qrs WHERE id = ?', [qrId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });

    if (!existing[0].accountant_editable) {
      return res.status(403).json({ message: 'QR này không cho phép kế toán chỉnh sửa' });
    }

    let main_image = existing[0].main_image;
    let qr_image = existing[0].qr_image;

    if (req.files) {
      if (req.files.main_image) {
        await deleteCloudinaryImage(existing[0].main_image);
        main_image = req.files.main_image[0].path;
      }
      if (req.files.qr_image) {
        await deleteCloudinaryImage(existing[0].qr_image);
        qr_image = req.files.qr_image[0].path;
      }
    }

    const updatedName = name !== undefined ? name : existing[0].name;
    const updatedMaxAmount = max_amount_per_trans ?? existing[0].max_amount_per_trans;
    const updatedFeeDefault = fee_rate ?? existing[0].fee_rate;
    const updatedFeeL1 = fee_rate_l1 ?? existing[0].fee_rate_l1;
    const updatedFeeL2 = fee_rate_l2 ?? existing[0].fee_rate_l2;
    const updatedFeeL3 = fee_rate_l3 ?? existing[0].fee_rate_l3;
    const updatedNote = note ?? existing[0].note;

    await pool.query(
      'UPDATE qrs SET name = ?, main_image = ?, qr_image = ?, max_amount_per_trans = ?, fee_rate = ?, fee_rate_l1 = ?, fee_rate_l2 = ?, fee_rate_l3 = ?, note = ? WHERE id = ?',
      [updatedName, main_image, qr_image, updatedMaxAmount, updatedFeeDefault, updatedFeeL1, updatedFeeL2, updatedFeeL3, updatedNote, qrId]
    );

    res.json({ message: 'Cập nhật QR thành công' });
  } catch (err) {
    console.error('Lỗi khi accountant cập nhật QR:', err);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// Xóa QR
const deleteQR = async (req, res) => {
  try {
    const qrId = req.params.id;
    
    // Lấy thông tin QR để xóa ảnh trên Cloudinary
    const [existing] = await pool.query('SELECT main_image, qr_image FROM qrs WHERE id = ?', [qrId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy QR' });

    // Xóa ảnh trên Cloudinary
    await deleteCloudinaryImage(existing[0].main_image);
    await deleteCloudinaryImage(existing[0].qr_image);

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
  toggleAccountantEditable,
  accountantUpdateQR,
  deleteQR,
  getAllQRs,
  getQRById
};
