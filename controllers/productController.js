const db = require('../config/db');

const createProduct = (req, res) => {
    const dataDiterima = req.body;
    const idAdminKasir = req.admin.id;

    if (!dataDiterima.product_name || !dataDiterima.price || !dataDiterima.category || !dataDiterima.stock) {
        return res.status(400).json({ message: "Gagal! Nama Produk, Harga, Kategori, dan Stock wajib diisi."});
    }

    const perintahSQL = 'INSERT INTO products (product_name, price, category, stock, created_by) VALUES (?, ?, ?, ?, ?)';

    db.query(perintahSQL, [dataDiterima.product_name, dataDiterima.price, dataDiterima.category, dataDiterima.stock, idAdminKasir], (err, hasil) => {
        if (err) {
            return res.status(500).json({
                message: "Gagal memasukkan produk",
                error: err.message
            });
        }

        res.status(201).json({
            message: "Hore! Produk barang baru berhasil ditambahkan ke minimarket dengan sukses!",
            dataProdukBaru: {
                id: hasil.insertId,
                product_name: dataDiterima.product_name,
                price: dataDiterima.price,
                category: dataDiterima.category,
                created_by_admin_id: idAdminKasir
            }
        });
    });
};

const getAllProducts = (req, res) => {
    const kategoriDiterima = req.query.category;
    const keywordDiterima = req.query.search;

    const prosesLabelStok = (daftarProduk) => {
        return daftarProduk.map(produk => {
            if (produk.stock < 5) {
                return {
                    ...produk,
                    status_stok: "KRITIS! Stok sisa sedikit dibawah 5 biji, segera hubungi agen pasokan!"
                };
            } else {
                return {
                    ...produk,
                    status_stok: "AMAN! Stok di rak masih tersedia melimpah."
                };
            }
        });
    };

    if (keywordDiterima) {
        const perintahSQLSearch = 'SELECT * FROM products WHERE product_name LIKE ?';
        const formatKeyword = `%${keywordDiterima}%`;

        db.query(perintahSQLSearch, [formatKeyword], (err, hasilSearch) => {
            if (err) {
                return res.status(500).json({ 
                    message: "Aduh, gagal mencari produk dari database minimarket!",
                    error: err.message
                });
            }

            if (hasilSearch.length === 0) {
                return res.status(404).json({
                    message: `Produk dengan kata kunci '${keywordDiterima}' tidak ditemukan di rak toko.`
                });
            }
            
            const hasilMatang = prosesLabelStok(hasilSearch);
            return res.status(200).json(hasilMatang);
        });

    } else if (kategoriDiterima) {
        const perintahSQLFilter = 'SELECT * FROM products WHERE category = ?';

        db.query(perintahSQLFilter, [kategoriDiterima], (err, hasilFilter) => {
            if (err) {
                return res.status(500).json({
                    message: "Aduh, gagal memfilter produk dari database minimarket!",
                    error: err.message
                });
            }

            if (hasilFilter.length === 0) {
                return res.status(404).json({
                    message: `Produk dengan kategori '${kategoriDiterima}' tidak ditemukan atau belum terdaftar. `
                });
            }

            const hasilMatang = prosesLabelStok(hasilFilter);
            return res.status(200).json(hasilMatang);
        });

    } else {
        const perintahSQL = 'SELECT * FROM products';

    db.query(perintahSQL, (err, hasilData) => {
        if (err) {
            return res.status(500).json({
                message: "Aduh, gagal mengambil daftar produk dari database minimarket!",
                error: err.message
            });
        }

            const hasilMatang = prosesLabelStok(hasilData);
            return res.status(200).json(hasilMatang);
        });
    }
};

const deleteProduct = (req, res) => {
    const idProduk = req.params.id;
    const perintahSQL = 'DELETE FROM products WHERE id = ?';

    db.query(perintahSQL, [idProduk], (err, hasil) => {
        if (err) {
            return res.status(500).json({
                message: "Aduh, gagal menghapus produk dari database minimarket!",
                error: err.message
            });
        }
        
        if (hasil.affectedRows === 0) {
            return res.status(404).json({ message: "Gagal menghapus! Nomor ID produk tidak ditemukan."});
        }

        res.status(200).json({
            message: `Hore! Produk dengan ID nomor ${idProduk} berhasil dihapus permanen dari minimarket!`
        });
    });
};

const updateProduct = (req, res) => {
    const idProduk = req.params.id;
    const dataDiterima = req.body;

    if (!dataDiterima.product_name || !dataDiterima.price || !dataDiterima.category) {
        return res.status(400).json({ message: "Gagal! Nama Produk, Harga, dan Kategori baru wajib diisi."});
    }

    const perintahSQL = 'UPDATE products SET product_name = ?, price = ?, category = ? WHERE id = ?';
    db.query(perintahSQL, [dataDiterima.product_name, dataDiterima.price, dataDiterima.category, idProduk], (err, hasil) => {
        if (err) {
            return res.status(500).json({
                message: "Aduh, gagal mengubah data produk di database minimarket",
                error: err.message
            });
        }
        
        if (hasil.affectedRows === 0) {
            return res.status(404).json({ message: "Gagal mengubah! Nomor ID produk tidak ditemukan."});
        }

        res.status(200).json({
            message: `Hore! Data produk dengan ID nomor ${idProduk} berhasil diperbarui dengan sukses!`,
            dataDiubah: {
                id: idProduk,
                product_name: dataDiterima.product_name,
                price: dataDiterima.price,
                category: dataDiterima.category
            }
        });
    });
};
module.exports = {
    createProduct,
    getAllProducts,
    deleteProduct,
    updateProduct,
};