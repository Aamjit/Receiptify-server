const db = require('../utils/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const calculatePriceWithDiscount = (price, discount = 0) => {
    if (discount === 0) return price;
    return (price - (price * (discount / 100)))
}

// ********** PROCESS REPORT DATA **********
/**
 * Generate the sales report data using UserId and the date range from the request body to generate the sales report.
 * @param {*} req 
 * @param {*} res 
 */
const generateReportData = async (req, res) => {
    if (!req.body) return res.status(403).json({ error: 'No request body found' });

    const { userId, fromDate, toDate } = req.body;

    // Set start of day
    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Set end of day
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    const receiptsRef = db.collection('Receipts');
    const query = receiptsRef
        .where('userId', '==', userId)
        .where('status', '==', 'complete')
        .where('createdAt', '>=', Timestamp.fromDate(startOfDay))
        .where('createdAt', '<=', Timestamp.fromDate(endOfDay));

    const querySnapshot = await query.get();
    const receiptsData = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        receiptsData.push({
            id: doc.id,
            receiptNumber: data.receiptNumber,
            date: new Date(data.timestamp).toISOString().split('T')[0],
            total: data.total,
            items: data.items,
            timestamp: data.timestamp,
            status: data.status,
        });
    });

    // Calculate total sales
    const total = receiptsData.reduce((sum, receipt) => sum + receipt.total, 0);

    // Calculate average transaction
    const avg = total / (receiptsData.length || 1);

    // Process top selling items
    const itemsMap = new Map();
    receiptsData.forEach(receipt => {
        receipt.items.forEach(item => {
            const existing = itemsMap.get(item.name) || { quantity: 0, revenue: 0 };
            const priceAfterDicount = calculatePriceWithDiscount(item.price, receipt?.discount);
            itemsMap.set(item.name, {
                quantity: existing.quantity + item.quantity,
                revenue: existing.revenue + (priceAfterDicount * item.quantity)
            });
        });
    });

    const topItemsArray = Array.from(itemsMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // Process daily sales
    const salesByDate = new Map();
    const salesCountByDate = new Map();
    receiptsData.forEach(receipt => {
        const date = receipt.date;
        salesByDate.set(date, (salesByDate.get(date) || 0) + receipt.total);
        salesCountByDate.set(date, (salesCountByDate.get(date) || 0) + 1);
    });

    const dailySalesArray = Array.from(salesByDate.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const dailySalesCountArray = Array.from(salesCountByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Receipts Heatmap: Count receipts by day of week and hour
    const heatmapMap = new Map(); // day -> hour -> count
    receiptsData.forEach(receipt => {
        if (receipt.timestamp) {
            const dateObj = new Date(receipt.timestamp);
            const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., 'Mon'
            const hour = dateObj.getHours();
            if (!heatmapMap.has(day)) heatmapMap.set(day, new Map());
            const hourMap = heatmapMap.get(day);
            hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        }
    });
    const heatmapArray = [];
    Array.from(heatmapMap.entries()).forEach(([day, hourMap]) => {
        Array.from(hourMap.entries()).forEach(([hour, count]) => {
            heatmapArray.push({ day, hour, count });
        });
    });

    const response = {
        totalSales: total,
        averageTransaction: avg,
        topItems: topItemsArray,
        dailySales: dailySalesArray,
        dailySalesCountArray: dailySalesCountArray,
        heatMap: heatmapArray,
    };

    res.status(200).json(response);
}

module.exports = generateReportData