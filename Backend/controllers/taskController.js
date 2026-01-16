const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (project admin only)
const createTask = async (req, res) => {
  try {
    const { title, description, project, assignToEmail } = req.body;

    // Validation
    if (!title || !project || !assignToEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, project, and user email to assign',
      });
    }

    // Find user to assign
    const assignUser = await User.findOne({ email: assignToEmail });

    if (!assignUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email',
      });
    }

    // Check if assignee is member of the project
    const projectDoc = await Project.findById(project);

    if (!projectDoc.isMember(assignUser._id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign task to user who is not a project member',
      });
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      project,
      assignedTo: assignUser._id,
      createdBy: req.user._id,
    });

    // Populate references
    await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
      { path: 'project', select: 'name' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    console.error('Create task error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during task creation',
      error: error.message,
    });
  }
};

// @desc    Get tasks (filtered by user role)
// @route   GET /api/tasks?project=projectId
// @access  Private (project member)
const getTasks = async (req, res) => {
  try {
    const { project } = req.query;

    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Please provide project ID',
      });
    }

    // Check if user is admin of this project
    const projectDoc = await Project.findById(project);

    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (!projectDoc.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

 // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { project };

    if (!projectDoc.isAdmin(req.user._id)) {
      query.assignedTo = req.user._id;
    }

    // Get total count
    const total = await Task.countDocuments(query);

    // Get paginated tasks
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: tasks,
    });
  } catch (error) {
    console.error('Get tasks error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user has access to this task
    const project = await Project.findById(task.project._id);

    if (!project.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Members can only see their own tasks
    if (
      !project.isAdmin(req.user._id) &&
      task.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own tasks',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Get task error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
// @access  Private (task owner only)
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status',
      });
    }

    // Validate status
    const validStatuses = ['todo', 'in-progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: todo, in-progress, or done',
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Only assignee can update their task status
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update status of tasks assigned to you',
      });
    }

    task.status = status;
    await task.save();

    await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
      { path: 'project', select: 'name' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Update task status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (admin or task owner)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user has permission to delete
    const project = await Project.findById(task.project);

    const isAdmin = project.isAdmin(req.user._id);
    const isOwner = task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks that are assigned to you or if you are a project admin',
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: {},
    });
  } catch (error) {
    console.error('Delete task error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc Update task
// @route PUT /api/tasks/:id
// @access Private (admin or task owner)
const updateTask = async (req, res) => {
  try {
    const { title, description, assignToEmail } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user has permission
    const project = await Project.findById(task.project);
    const isAdmin = project.isAdmin(req.user._id);
    const isOwner = task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you or if you are a project admin',
      });
    }

    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;

    // Only admin can reassign task
    if (assignToEmail && isAdmin) {
      const newAssignee = await User.findOne({ email: assignToEmail });
      if (!newAssignee) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email',
        });
      }

      if (!project.isMember(newAssignee._id)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign task to user who is not a project member',
        });
      }

      task.assignedTo = newAssignee._id;
    }

    await task.save();
    await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
      { path: 'project', select: 'name' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Update task error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc Search tasks by title
// @route GET /api/tasks/search?q=searchTerm&project=projectId
// @access Private
const searchTasks = async (req, res) => {
  try {
    const { q, project } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search query (q parameter)',
      });
    }

    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Please provide project ID',
      });
    }

    // Check project access
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (!projectDoc.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    let query = {
      project,
      title: { $regex: q, $options: 'i' }, // Case-insensitive search
    };

    // If not admin, show only their tasks
    if (!projectDoc.isAdmin(req.user._id)) {
      query.assignedTo = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error('Search tasks error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,        
  searchTasks,
  updateTaskStatus,
  deleteTask,
};