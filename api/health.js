// Vercel Serverless Function: Health Check

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.status(200).json({
        status: 'ok',
        message: 'NIA VC API is running on Vercel',
        timestamp: new Date().toISOString()
    });
}
