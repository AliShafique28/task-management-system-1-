const express = require('express');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,      
  searchProjects,
  addMember,
  promoteMember,
  deleteProject,
  removeMember,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { checkProjectAdmin } = require('../middleware/projectAuth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/').post(createProject).get(getProjects);

router.route('/search').get(searchProjects); 

router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);

router.route('/:projectId/members').post(checkProjectAdmin, addMember);

router
  .route('/:projectId/members/:userId/promote')
  .patch(checkProjectAdmin, promoteMember);

router
  .route('/:projectId/members/:userId')
  .delete(checkProjectAdmin, removeMember);

module.exports = router;