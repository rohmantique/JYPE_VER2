const express = require('express');
const axios = require('axios');
const app = express();
const port = 8080;

app.get('/api/data', async (req, res) => {
    const response = await axios.get('https://my409514-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_WBS_GLACCOUNT_API_CDS/YY1_WBS_GLACCOUNT_API', {
        headers: {
            'Authorization': 'Basic ' + Buffer.from('BTP_USER:KBUEVFHSlaubYLxf3j&hPXxfHWAEZrNRURLyzArc').toString('base64')
        }
    });

    res.send(response.data);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});