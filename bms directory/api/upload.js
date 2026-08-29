export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fileName, fileContent } = req.body;

    if (!fileName || !fileContent) {
        return res.status(400).json({ error: 'Missing file name or content' });
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;

    if (!token || !owner || !repo) {
        return res.status(500).json({ error: 'Server configuration error: Missing GitHub environment variables.' });
    }

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `uploads/${timestamp}_${cleanFileName}`;

    try {
        const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'User-Agent': 'LaserKiwi-BMS-Secure-Proxy'
            },
            body: JSON.stringify({
                message: `Upload asset image: ${cleanFileName} via secure proxy`,
                content: fileContent,
                branch: branch
            })
        });

        if (!githubResponse.ok) {
            const errData = await githubResponse.json();
            throw new Error(errData.message || 'Failed to commit file to GitHub repository');
        }

        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

        return res.status(200).json({ 
            success: true, 
            url: rawUrl,
            path: filePath 
        });

    } catch (error) {
        console.error('GitHub Proxy Error:', error);
        return res.status(500).json({ error: error.message });
    }
}