const db = require('../config/db');

const createTransaction = (req, res) => {
    const dataDiterima = req.body; 
    const idAdminKasir = req.admin.id;

    if (!dataDiterima.customer_name || !dataDiterima.items || dataDiterima.items.length === 0) {
        return res.status(400).json({ 
            message: "Gagal! Nama Pelanggan dan Daftar Item Barang wajib diisi." 
        });
    }

    const sqlTransaction = 'INSERT INTO transactions (total_price, customer_name, admin_id) VALUES (0, ?, ?)';
    
    db.query(sqlTransaction, [dataDiterima.customer_name, idAdminKasir], (err, hasilTransaction) => {
        if (err) {
            return res.status(500).json({ message: "Gagal membuat nota induk!", error: err.message });
        }

        const newTransactionId = hasilTransaction.insertId;
        let totalHargaNota = 0;
        let itemSelesaiDihitung = 0;
        let adaErrorStok = false;
        const listRincianNota = [];

        dataDiterima.items.forEach((item) => {
            
            const sqlAmbilHarga = 'SELECT price, product_name, stock FROM products WHERE id = ?';
            
            db.query(sqlAmbilHarga, [item.product_id], (err, hasilProduct) => {
                if (err || hasilProduct.length === 0) {
                    return res.status(404).json({ message: `Produk dengan ID ${item.product_id} tidak ditemukan!` });
                }

                const hargaAsliProduk = hasilProduct[0].price;
                const namaProdukBarang = hasilProduct[0].product_name;
                const stokTersedia = hasilProduct[0].stock;

                if (item.quantity > stokTersedia) {
                    adaErrorStok = true;
                    return res.status(400).json({
                        message: `Transaksi Ditolak! Stok untuk barang '${namaProdukBarang}' tidak mencukupi. Sisa stok di rak hanya tinggal ${stokTersedia} biji.`
                    });
                }

                const subtotalHargaItem = hargaAsliProduk * item.quantity; 
                totalHargaNota += subtotalHargaItem; 

                const sqlInsertDetail = 'INSERT INTO transaction_details (transaction_id, product_id, quantity, subtotal) VALUES (?, ?, ?, ?)';
                
                db.query(sqlInsertDetail, [newTransactionId, item.product_id, item.quantity, subtotalHargaItem], (err) => {
                    if (err) {
                        return res.status(500).json({ message: "Gagal menyimpan rincian barang!", error: err.message });
                    }
                    
                const sqlPotongStok = 'UPDATE products SET stock = stock - ? WHERE id = ?';

                db.query(sqlPotongStok, [item.quantity, item.product_id], (errStok) => {
                    if (errStok) {
                        console.error("Aduh, gagal memotong stok otomatis untuk produk ID:" + item.product_id);
                    }
                });

                    listRincianNota.push({
                        product_id: item.product_id,
                        nama_barang: namaProdukBarang,
                        harga_satuan: hargaAsliProduk,
                        jumlah_beli: item.quantity,
                        subtotal: subtotalHargaItem
                    });

                    itemSelesaiDihitung++;

                    if (itemSelesaiDihitung === dataDiterima.items.length && !adaErrorStok) {
                        
                        let nominalDiskon = 0;
                        let hargaAsliSebelumDiskon = totalHargaNota;

                        if (totalHargaNota > 50000) {
                            nominalDiskon = totalHargaNota *0.10;
                            totalHargaNota = totalHargaNota - nominalDiskon;
                        }

                        const sqlUpdateTotal = 'UPDATE transactions SET total_price = ? WHERE id = ?';
                        
                        db.query(sqlUpdateTotal, [totalHargaNota, newTransactionId], (err) => {
                            if (err) {
                                return res.status(500).json({ message: "Gagal memperbarui total harga nota!", error: err.message });
                            }

                            res.status(201).json({
                                message: "Hore! Transaksi Berhasil! Nota belanja borongan dicetak super detail!",
                                notaDigital: {
                                    nomor_nota: newTransactionId,
                                    nama_pelanggan: dataDiterima.customer_name,
                                    total_belanja_awal: hargaAsliSebelumDiskon,
                                    potongan_diskon_10pct: nominalDiskon,
                                    total_pembayaran: totalHargaNota,
                                    kasir_id: idAdminKasir,
                                    rincian_item_belanjaan: listRincianNota
                                }
                            });
                        });
                    }
                });
            });
        });
    });
};

const deleteTransaction = (req, res) => {
    const idNota = req.params.id;

    const sqlIntipKeranjang = 'SELECT product_id, quantity FROM transaction_details WHERE transaction_id = ?';

    db.query(sqlIntipKeranjang, [idNota], (errIntip, listBarangKetemu) => {
        if (errIntip) {
            return res.status(500).json({ message: "Gagal mengintip rincian keranjang lama!", error: errIntip.message });
        }

        if (listBarangKetemu.length === 0) {
            return res.status(404).json({ message: `Gagal menghapus! Nota dengan ID ${idNota} tidak ditemukan di sistem. `});
        }
        
        let itemSelesaiKembali = 0;

        listBarangKetemu.forEach((item) => {
            const sqlKembalikanStok = 'UPDATE products SET stock = stock + ? WHERE id = ?';

            db.query(sqlKembalikanStok, [item.quantity, item.product_id], (errRestock) => {
                if (errRestock) {
                    console.error("Aduh, gagal memulihkan stok otomatis untuk produk ID: " + item.product_id);
                }

                itemSelesaiKembali++;

                if (itemSelesaiKembali === listBarangKetemu.length) {
                    
                     const sqlHapusAnak = 'DELETE FROM transaction_details WHERE transaction_id = ?';

                     db.query(sqlHapusAnak, [idNota], (err) =>  {
                        if (err) {
                            return res.status(500).json({
                                message: "Gagal membersihkan rincian item nota di laci anak!", 
                                error: err.message
                            });
                        }

                        const sqlHapusInduk = 'DELETE FROM transactions WHERE id =?';

                        db.query(sqlHapusInduk, [idNota], (err, hasilEksekusi) => {
                            if (err) {
                                return res.status(500).json({
                                    message: "Gagal menghapus nota induk transaksi!",
                                    error: err.message
                                });
                            }

                            if (hasilEksekusi.affectedRows === 0) {
                                return res.status(404).json({
                                    message: `Gagal menghapus! Nota dengan ID ${idNota} memang tidak ada di database. `
                                });
                            }

                            res.status(200).json({
                                message: `Sukses Mutlak! Nota Transaksi ID ${idNota} dan seluruh rincian itemnya telah dihapus permanen dari sistem minimarket.`
                            });
                        });
                    });
                }
            });
        });
    });
};

const getAllTransactions = (req, res) => {
    const perintahSQL = 'SELECT * FROM transactions ORDER BY id DESC';

    db.query(perintahSQL, (err, daftarNota) => {
        if (err) {
            return res.status(500).json({
                message: "Aduh, gagal menarik rekap data transaksi dari database",
                error: err.message
            });
        }

        let totalOmzetToko = 0;
        daftarNota.forEach((nota) => {
            totalOmzetToko += nota.total_price;
        });

        res.status(200).json({
            message: "Hore! Laporan rekap data transaksi minimarket berhasil ditarik dengan sukses!",
            ringkasan_bisnis: {
                total_nota_tercetak: daftarNota.length,
                total_omzet_pendapatan: totalOmzetToko
            },
            catatan_riwayat_nota: daftarNota
        });
    });
};

const getTransactionById = (req, res) => {
    const idNota = req.params.id;
    const sqlInduk = 'SELECT * FROM transactions WHERE id = ?';

    db.query(sqlInduk, [idNota], (err, hasilInduk) => {
        if (err) {
            return res.status(500).json({ message: "Gagal memproses database induk!", error: err.message});
        }
        
        if (hasilInduk.length === 0) {
            return res.status(404).json({ message: `Nota Transaksi dengan ID nomor${idNota} tidak ditemukan!`});
        }

        const dataNoInduk = hasilInduk[0];

        const sqlAnak = `
            SELECT td.product_id, p.product_name, p.price AS harga_satuan, td.quantity AS jumlah_beli, td.subtotal
            FROM transaction_details td
            JOIN products p ON td.product_id = p.id
            WHERE td.transaction_id = ?
            `;

        db.query(sqlAnak, [idNota], (errAnak, daftarBarangKetemu) => {
            if (errAnak) {
                return res.status(500).json({ message: "Gagal menarik rincian barang dari laci anak!", error: errAnak.message });
            }

            res.status(200).json({
                message: `Sukses Menampilkan Rincian Resmi Nota Nomor ${idNota}!`,
                informasi_nota: {
                    nomor_nota: dataNoInduk,
                    nama_pelanggan: dataNoInduk.customer_name,
                    total_pembayaran_bersih: dataNoInduk.total_price,
                    waktu_transaksi: dataNoInduk.created_at,
                    pelayan_kasir_id: dataNoInduk.admin_id
                },
                keranjang_belanja_borongan: daftarBarangKetemu
            });
        });
    });
};
module.exports = {
    createTransaction,
    deleteTransaction,
    getAllTransactions,
    getTransactionById
};
