const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const transactionsController = require('../controllers/transactionsController');

const { verifikasiToken, managerOnly } = require('../middleware/authMiddleware');

router.post('/register', authController.registerAdmin);
router.post('/login', authController.loginAdmin);
router.get('/profile', verifikasiToken, authController.getProfile);

router.post('/products', verifikasiToken, managerOnly, productController.createProduct);
router.get('/products', verifikasiToken, productController.getAllProducts);
router.delete('/products/:id', verifikasiToken, managerOnly, productController.deleteProduct);
router.put('/products/:id', verifikasiToken, managerOnly, productController.updateProduct);

router.post('/transactions', verifikasiToken, transactionsController.createTransaction);
router.get('/transactions', verifikasiToken, transactionsController.getAllTransactions);
router.get('/transactions/:id', verifikasiToken, transactionsController.getTransactionById);
router.delete('/transactions/:id', verifikasiToken, managerOnly, transactionsController.deleteTransaction);

module.exports = router;