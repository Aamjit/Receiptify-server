const generateHTMLForReport = require("../utils/generateHTMLForReport");
const minifyHTML = require("../utils/minifyHTML");

// ********** GENERATE HTML **********
const generateReportHTML = async (req, res) => {     // checkAppId,
    const { selectedRangeLabel,
        totalSales,
        averageTransaction,
        topItems,
        dailySales,
        dailySalesCount = [],
        businessInfo } = req?.body;

    const html = generateHTMLForReport({
        selectedRangeLabel,
        totalSales,
        averageTransaction,
        topItems,
        dailySales,
        dailySalesCount,
        businessInfo
    })

    if (html.length === 0) {
        return res.status(500).json({ error: 'Failed: Template generation' });
    }

    return res.status(200).json({
        html: minifyHTML(html)
    })
};

module.exports = generateReportHTML