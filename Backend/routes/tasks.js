const express = require('express');
const {
  createTask,
  getTasks,
  getTask,
  updateTask,        
  searchTasks,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { checkProjectAdmin } = require('../middleware/projectAuth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/').post(checkProjectAdmin, createTask).get(getTasks);

router.route('/search').get(searchTasks);

router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);

router.route('/:id/status').patch(updateTaskStatus);

module.exports = router;