const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerAdmin = async (req, res) => {
    const dataDiterima = req.body;
    if (!dataDiterima.username || !dataDiterima.password) {
        return res.status(400).json({ message: "Gagal! Username dan Password wajib diisi."});
    }

    try {
        const passwordAcak = await bcrypt.hash(dataDiterima.password, 10);
        const perintahSQL = 'INSERT INTO admins (username, password) VALUES (?, ?)';
        db.query(perintahSQL, [dataDiterima.username, passwordAcak], (err, hasil) => {
            if (err) {
                return res.status(500).json({
                    message: "Aduh, gagal mendaftarkan akun kasir ke database minimarket",
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Akun Kasir Minimarket berhasil didaftarkan dengan aman!",
                username: dataDiterima.username
            });
        });

    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan sistem pada server minimarket."});
    }
};

const loginAdmin = async (req, res) => {
    const dataDiterima = req.body;
    if (!dataDiterima.username || !dataDiterima.password) {
        return res.status(400).json({ message: "Gagal! Username dan Password wajib diisi."});
    }

    const perintahSQL = 'SELECT * FROM admins WHERE username = ?';
    db.query(perintahSQL, [dataDiterima.username], async (err, hasil) => {
        if (err) {
            return res.status(500).json({ message: "Gagal memproses database!", error: err.message});
        }

        if (hasil.length === 0) {
            return res.status(401).json({ message: "Login Gagal! Username tidak ditemukan."});
        }

        const adminKetemu = hasil[0];
        try {
            const passwordCocok = await bcrypt.compare(dataDiterima.password, adminKetemu.password);
            if (!passwordCocok) {
                return res.status(400).json({ message: "Login Gagal! Password yang anda masukan salah"})
            }

            const dataToken = { 
                id: adminKetemu.id, 
                username: adminKetemu.username,
                role: adminKetemu.role
            };
            
            const tokenBaru = jwt.sign(dataToken, process.env.JWT_SECRET, {expiresIn: '1h'});

            let siapaLogin = "Kasir";
            if (adminKetemu.role === 'manager') {
                siapaLogin = "Manager";
            }

            res.json({
                message: `Hore! Login Berhasil. Selamat Datang ${siapaLogin} Minimarket Sah!`,
                username: adminKetemu.username,
                token: tokenBaru
            });
            
        } catch (error) {
            res.status(500).json({ message: "Gagal memproses keamanan password."});
        }
    });
};

const getProfile = (req, res) => {
    const idAdminAktif = req.admin.id;
    const perintahSQL = 'SELECT id, username, role FROM admins WHERE id = ?';

    db.query(perintahSQL, [idAdminAktif], (err, hasil) => {
        if (err) {
            return res.status(500).json({ message: "Gagal memproses profil admin!", error: err.message });
        }

        if (hasil.length === 0) {
            return res.status(404).json({ message: "Akun admin tidak ditemukan di sistem!" });
        }

        const adminKetemu = hasil[0]

        res.status(200).json({ 
            message: `Hore! Sukses mengambil data profil kasir aktif! Selamat Datang, Kasir ${adminKetemu.username}! Selamat bertugas dan jaga kas minimarket dengan aman ya!`,
            profilAdmin: {
                id: adminKetemu.id,
                username: adminKetemu.username,
                role: adminKetemu.role
            }
        });
    });
};

module.exports = {
    registerAdmin, 
    loginAdmin,
    getProfile,
};