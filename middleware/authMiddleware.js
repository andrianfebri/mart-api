const jwt = require('jsonwebtoken');

const verifikasiToken = (req, res, next) => {
    const headerAuth = req.headers && req.headers['authorization'];

    if (!headerAuth) {
        return res.status(401).json({ message: "Akses Ditolak! Anda tidak membawa tiket token akses."});
    }

    const token = headerAuth && headerAuth.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Akses Ditolak! Format token salah atau kosong"});
    }
    
    try {
        const dataTerverifikasi = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = dataTerverifikasi;
        next();
    } catch (error) {
        res.status(403).json({ message: "Akses Ditolak! Tiket token anda tidak sah atau sudah kedaluwarsa."});
    }
};

const managerOnly = (req, res, next) => {
    const roleAdminAktif = req.admin.role;

    if (roleAdminAktif !== 'manager') {
        return res.status(403).json({
            message: "Akses Ditolak! Tindakan sakral ini murni hanya diizinkan untuk akun level Manager, kasir biasa dilarang!"
        });
    }

    next();
};

module.exports = {
    verifikasiToken,
    managerOnly
}