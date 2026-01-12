const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        switch (req.method) {
            case 'GET':
                return await getHours(req, res);
            case 'POST':
                return await addHours(req, res);
            case 'DELETE':
                return await deleteHours(req, res);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function getHours(req, res) {
    const { rows } = await sql`
        SELECT * FROM hours 
        ORDER BY date DESC, created_at DESC
    `;
    return res.status(200).json(rows);
}

async function addHours(req, res) {
    const { date, hours } = req.body;
    
    if (!date || !hours || hours <= 0) {
        return res.status(400).json({ error: 'Invalid date or hours' });
    }
    
    await sql`
        INSERT INTO hours (date, hours) 
        VALUES (${date}, ${hours})
    `;
    
    return res.status(200).json({ success: true });
}

async function deleteHours(req, res) {
    const { id } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    
    await sql`DELETE FROM hours WHERE id = ${id}`;
    
    return res.status(200).json({ success: true });
}