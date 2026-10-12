const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  addOffer,
  listMyOffers,
  listActiveOffers,
  changeOfferStatus,
} = require('../controllers/offerController');

const router = express.Router();

// Business users can browse available shipping offers.
router.get('/active', authenticateToken, allowRoles('business_user'), listActiveOffers);

// All routes below require a logged-in logistics provider.
router.use(authenticateToken, allowRoles('provider'));

router.post('/', addOffer);
router.get('/my', listMyOffers);
router.patch('/:id/status', changeOfferStatus);

module.exports = router;