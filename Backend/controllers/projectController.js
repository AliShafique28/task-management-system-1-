const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a project name',
      });
    }

    // Create project with creator as first admin
    const project = await Project.create({
      name,
      description,
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'admin',
          addedAt: Date.now(),
        },
      ],
    });

    // Populate user details
    await project.populate('members.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    console.error('Create project error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during project creation',
      error: error.message,
    });
  }
};

// @desc    Get all projects where user is a member
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
     // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Project.countDocuments({
      'members.user': req.user._id,
    });

    // Get paginated projects
    const projects = await Project.find({
      'members.user': req.user._id,
    })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: projects,
    });
  } catch (error) {
    console.error('Get projects error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private (must be member)
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }
    // console.log('==================== DEBUG ====================');
    // console.log('Requested by User ID:', req.user._id);
    // console.log('Project ID:', project._id);
    // console.log('Project Members:');
    // project.members.forEach((member, index) => {
    //   console.log(`  Member ${index + 1}:`, {
    //     userId: member.user._id,
    //     name: member.user.name,
    //     role: member.role
    //   });
    // });
    // console.log('isMember result:', project.isMember(req.user._id));
    // console.log('===============================================');
    // Check if user is member
    if (!project.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project.',
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Get project error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:projectId/members
// @access  Private (admin only)
const addMember = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user email',
      });
    }

    // Find user by email
    const userToAdd = await User.findOne({ email });

    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email',
      });
    }

    // Check if user is already a member
    const existingMember = req.project.members.find(
      (m) => m.user.toString() === userToAdd._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project',
      });
    }

    // Add user as member
    req.project.members.push({
      user: userToAdd._id,
      role: 'member',
      addedAt: Date.now(),
    });

    await req.project.save();

    // Populate and return
    await req.project.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: req.project,
    });
  } catch (error) {
    console.error('Add member error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Promote member to admin
// @route   PATCH /api/projects/:projectId/members/:userId/promote
// @access  Private (admin only)
const promoteMember = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find member in project
    const member = req.project.members.find(
      (m) => m.user.toString() === userId
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this project',
      });
    }

    if (member.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin',
      });
    }

    // Promote to admin
    member.role = 'admin';
    await req.project.save();

    await req.project.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member promoted to admin successfully',
      data: req.project,
    });
  } catch (error) {
    console.error('Promote member error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Delete project (and all its tasks)
// @route   DELETE /api/projects/:id
// @access  Private (creator only)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Only creator can delete the project
    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the project creator can delete this project',
      });
    }

    // Delete all tasks associated with this project
    const Task = require('../models/Task');
    await Task.deleteMany({ project: project._id });

    // Delete the project
    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project and all associated tasks deleted successfully',
      data: {},
    });
  } catch (error) {
    console.error('Delete project error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:projectId/members/:userId
// @access  Private (admin only)
const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find member in project
    const memberIndex = req.project.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this project',
      });
    }

    // Cannot remove the creator
    if (req.project.createdBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project creator',
      });
    }

    // Remove member
    req.project.members.splice(memberIndex, 1);
    await req.project.save();

    await req.project.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: req.project,
    });
  } catch (error) {
    console.error('Remove member error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc Update project
// @route PUT /api/projects/:id
// @access Private (admin only)
const updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }
    
    // Check if user is admin
    if (!project.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only project admins can update this project',
      });
    }

    // Update fields
    if (name) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();
    await project.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  } catch (error) {
    console.error('Update project error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc Search projects by name
// @route GET /api/projects/search?q=searchTerm
// @access Private
const searchProjects = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search query (q parameter)',
      });
    }

    // Search in projects where user is member AND name matches
    const projects = await Project.find({
      'members.user': req.user._id,
      name: { $regex: q, $options: 'i' }, // Case-insensitive search
    })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Search projects error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  searchProjects,
  addMember,
  promoteMember,
  deleteProject,
  removeMember,
};