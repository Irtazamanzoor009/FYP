const mongoose = require('mongoose');

// The Senior's Recommended Schema
const IssueSchema = new mongoose.Schema({
    task_id: String,           // Jira Key (e.g., FD-12)
    title: String,             // Summary
    description: String,       // Full text description
    type: String,              // Bug, Story, Task
    priority: String,          // High, Medium, Low
    assignee: String,          // Name of developer
    assignee_id: String,       // Unique ID (good for tracking same dev across projects)
    project_name: String,      // To track cross-project availability
    status: String,            // To Do, In Progress
    story_points: Number,      // Effort estimate
    created_at: Date,
    due_date: Date,
    resolution_date: Date,     // Null if not finished
    time_estimate: Number,     // In seconds
    time_spent: Number,        // In seconds
    
    // Dependencies (Crucial for AI Logic)
    blocked_by: [String],      // Array of Task IDs that block this one
    depends_on: [String],      // Array of Task IDs this one blocks
    
    // Context
    sprint_name: String,
    sprint_state: String,      // active, closed
    comments: [String],        // AI reads these to find "hidden risks"
    
    // AI Calculation Helpers
    is_overdue: Boolean
});

const ProjectSnapshotSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    snapshot_type: String,     // "Daily Scan" or "Manual Trigger"
    total_issues: Number,
    issues: [IssueSchema]      // Stores all issues from ALL projects
});

module.exports = mongoose.model('ProjectSnapshot', ProjectSnapshotSchema);