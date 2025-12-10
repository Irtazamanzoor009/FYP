const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// URL: localhost:3000/api/jira/fetch
router.get('/fetch', projectController.getJiraData);

module.exports = router;