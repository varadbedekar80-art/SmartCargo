
const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  addCargo,
  listCargo,
  editCargo,
  removeCargo,
} = require('../controllers/cargoController');

const router = express.Router();

router.use(authenticateToken, allowRoles('business_user'));

router.post('/', addCargo);
router.get('/', listCargo);
router.put('/:id', editCargo);
router.delete('/:id', removeCargo);

module.exports = router;
