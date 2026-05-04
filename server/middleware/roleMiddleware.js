const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Bạn không có quyền thực hiện hành động này (Yêu cầu quyền: ${roles.join(', ')})`
      });
    }
    next();
  };
};

module.exports = { authorize };
