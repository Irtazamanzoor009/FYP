const axios = require('axios');
const ProjectSnapshot = require('../models/ProjectSnapshot');

const getAuthHeader = () => {
    const authString = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    return `Basic ${authString}`;
};

const fetchAndStoreJiraData = async () => {
    const domain = process.env.JIRA_DOMAIN;

    // JQL: Empty "project" means fetch ALL projects the user has access to.
    // We order by updated to get the freshest data first.
    const jql = `created >= -365d ORDER BY updated DESC`; 

    console.log(`🔄 Service: Fetching global data from https://${domain}...`);

    try {
        const response = await axios.post(
            `https://${domain}/rest/api/3/search/jql`, 
            {
                jql: jql,
                // We ask for specific fields to fill our Schema
                fields: [
                    "summary", "status", "assignee", "description", "priority", 
                    "issuetype", "created", "duedate", "resolutiondate", 
                    "timeoriginalestimate", "timespent", "issuelinks", "comment", "project",
                    "customfield_10020", // Standard ID for SPRINTS in Jira Cloud
                    "customfield_10016"  // Standard ID for STORY POINTS in Jira Cloud
                ],
                maxResults: 100 // For FYP, 100 is enough. Real prod uses pagination.
            },
            {
                headers: {
                    'Authorization': getAuthHeader(),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        const rawIssues = response.data.issues;
        const cleanIssues = [];

        console.log(`✅ Fetched ${rawIssues.length} issues from all projects.`);

        rawIssues.forEach(issue => {
            const fields = issue.fields;
            
            // 1. Calculate Overdue
            const dueDate = fields.duedate ? new Date(fields.duedate) : null;
            let isOverdue = false;
            if (dueDate && !fields.resolutiondate) {
                if (dueDate < new Date()) isOverdue = true;
            }

            // 2. Parse Blockers (Dependencies)
            let blockedBy = [];
            let dependsOn = [];
            if (fields.issuelinks) {
                fields.issuelinks.forEach(link => {
                    // "inward" means someone blocks me. "outward" means I block someone.
                    if (link.type.inward === "is blocked by" && link.inwardIssue) {
                        blockedBy.push(link.inwardIssue.key);
                    }
                    if (link.type.outward === "blocks" && link.outwardIssue) {
                        dependsOn.push(link.outwardIssue.key);
                    }
                });
            }

            // 3. Parse Sprint Data (It comes as a complex Array or Null)
            let sprintName = "Backlog";
            let sprintState = "future";
            if (fields.customfield_10020 && fields.customfield_10020.length > 0) {
                // Jira sends sprint data like: "com.atlassian.greenhopper.service.sprint.Sprint@..."
                // But in API v3, it often returns an object. We try to grab the name safely.
                const sprint = fields.customfield_10020[0];
                if (sprint.name) sprintName = sprint.name;
                if (sprint.state) sprintState = sprint.state;
            }

            // 4. Parse Comments (Get last 3 comments for context)
            let commentsText = [];
            if (fields.comment && fields.comment.comments) {
                commentsText = fields.comment.comments.slice(-3).map(c => 
                    `${c.author.displayName}: ${c.body.content ? "Rich Text" : c.body}` // Simplified
                );
            }

            // 5. Map to Senior's Schema
            cleanIssues.push({
                task_id: issue.key,
                title: fields.summary,
                description: fields.description ? JSON.stringify(fields.description).substring(0, 500) : "", // Limit size
                type: fields.issuetype.name,
                priority: fields.priority ? fields.priority.name : "Medium",
                assignee: fields.assignee ? fields.assignee.displayName : "Unassigned",
                assignee_id: fields.assignee ? fields.assignee.accountId : null,
                project_name: fields.project.name,
                status: fields.status.name,
                story_points: fields.customfield_10016 || 0,
                created_at: fields.created,
                due_date: dueDate,
                resolution_date: fields.resolutiondate,
                time_estimate: fields.timeoriginalestimate || 0,
                time_spent: fields.timespent || 0,
                blocked_by: blockedBy,
                depends_on: dependsOn,
                sprint_name: sprintName,
                sprint_state: sprintState,
                comments: commentsText,
                is_overdue: isOverdue
            });
        });

        // Save Snapshot
        const snapshot = new ProjectSnapshot({
            snapshot_type: "Global Fetch",
            total_issues: cleanIssues.length,
            issues: cleanIssues
        });

        await snapshot.save();
        return snapshot;

    } catch (error) {
        console.error("❌ Jira API Error:", error.message);
        if (error.response) console.error("Details:", JSON.stringify(error.response.data, null, 2));
        throw error;
    }
};

module.exports = { fetchAndStoreJiraData };