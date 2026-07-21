const express = require('express');
const router = express.Router();
const athleteController = require('../controllers/athleteController');

// POST /api/athletes — тренер создаёт нового спортсмена
router.post('/', athleteController.createAthlete);

module.exports = router;
