const axios = require('axios');
const ProjectSnapshot = require('../models/ProjectSnapshot');

const getAuthHeader = () => {
    const authString = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    return `Basic ${authString}`;
};

const fetchAndStoreJiraData = async () => {
    const projectKey = process.env.JIRA_PROJECT_KEY; 
    const domain = process.env.JIRA_DOMAIN;

    // Use quotes around project key just to be safe: project = "FD"
    const jql = `project = "${projectKey}" ORDER BY created DESC`;

    console.log(`🔄 Service: Connecting to Jira URL: https://${domain}/rest/api/3/search/jql`);

    try {
        // --- THE FIX: ADD /jql TO THE URL ---
        const response = await axios.post(
            `https://${domain}/rest/api/3/search/jql`, 
            {
                jql: jql,
                fields: ["summary", "status", "assignee", "duedate", "priority", "created", "resolutiondate", "description"],
                maxResults: 50
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

        console.log(`✅ Jira responded! Found ${rawIssues.length} issues.`);

        rawIssues.forEach(issue => {
            const dueDate = issue.fields.duedate ? new Date(issue.fields.duedate) : null;
            let isOverdue = false;

            if (dueDate && !issue.fields.resolutiondate) {
                const today = new Date();
                if (dueDate < today) isOverdue = true;
            }

            cleanIssues.push({
                key: issue.key,
                summary: issue.fields.summary,
                assignee: issue.fields.assignee ? issue.fields.assignee.displayName : "Unassigned",
                status: issue.fields.status.name,
                priority: issue.fields.priority ? issue.fields.priority.name : "Medium",
                createdDate: issue.fields.created,
                dueDate: dueDate,
                resolutionDate: issue.fields.resolutiondate,
                description: issue.fields.description ? JSON.stringify(issue.fields.description) : "No description",
                isOverdue: isOverdue
            });
        });

        const snapshot = new ProjectSnapshot({
            projectKey: projectKey,
            totalIssues: cleanIssues.length,
            issues: cleanIssues
        });

        await snapshot.save();
        return snapshot;

    } catch (error) {
        console.error("❌ Jira API Error:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Message:", error.message);
        }
        throw error;
    }
};

module.exports = { fetchAndStoreJiraData };