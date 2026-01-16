const Project = require('../models/Project');

// Check if user is admin of the project
const checkProjectAdmin = async (req, res, next) => {
    try {
        // Get projectId from params or body
        const projectId = req.params.projectId || req.body.project;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required',
            });
        }

        // Find project
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }

        // Check if user is admin of this project
        if (!project.isAdmin(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only project admins can perform this action.',
            });
        }

        // Attach project to request for convenience
        req.project = project;
        next();
    } catch (error) {
        console.error('Project admin check error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error during authorization',
        });
    }
};

// Check if user is member (admin or regular member) of the project
const checkProjectMember = async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.body.project || req.query.project;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required',
            });
        }

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }

        // Check if user is member of this project
        if (!project.isMember(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not a member of this project.',
            });
        }

        req.project = project;
        next();
    } catch (error) {
        console.error('Project member check error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error during authorization',
        });
    }
};

module.exports = { checkProjectAdmin, checkProjectMember };