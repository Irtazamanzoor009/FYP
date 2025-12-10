const jiraService = require('../services/jiraService');

const getJiraData = async (req, res) => {
    try {
        // Call the service to do the heavy work
        const savedData = await jiraService.fetchAndStoreJiraData();

        res.status(200).json({
            success: true,
            message: "Data fetched from Jira and saved to MongoDB",
            count: savedData.totalIssues,
            data: savedData
        });

    } catch (error) {
        console.error("Controller Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch data",
            error: error.message
        });
    }
};

module.exports = { getJiraData };