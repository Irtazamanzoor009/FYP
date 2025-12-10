const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
    key: String,          // e.g., FD-4
    summary: String,      // e.g., "Fix Login Bug"
    assignee: String,     // e.g., "Ali"
    status: String,       // e.g., "To Do"
    priority: String,     // e.g., "High"
    createdDate: Date,    // When task started
    dueDate: Date,        // Deadline
    resolutionDate: Date, // When finished (null if active)
    description: String,  // Description text
    isOverdue: Boolean    // Helper flag for AI
});

const ProjectSnapshotSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    projectKey: String,
    totalIssues: Number,
    issues: [IssueSchema] // Embeds the array of issues above
});

module.exports = mongoose.model('ProjectSnapshot', ProjectSnapshotSchema);