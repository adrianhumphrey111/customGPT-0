const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios')
const app = express();

const CLIENT_ID = '86evj6mojpyxvv';
const CLIENT_SECRET = 'XLbTDKBqLYHo6n51';
const REDIRECT_URI = 'http://localhost:3001/auth/linkedin/callback';

// Enable CORS for all routes
app.use(cors());
const port = 3001

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/todos', async (req, res) => {
  console.log("Request Headers: ", req.headers);
    const todos = [
        "This is the first todo",
        "This is the second todo"
    ]
    res.json({todos})
})


// Route to start the OAuth flow
app.get('/auth/linkedin', (req, res) => {
  const linkedInAuthURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20w_member_social%20email`;
  res.redirect(linkedInAuthURL);
});


// Callback route
app.get('/auth/linkedin/callback', async (req, res) => {
    const code = req.query.code;
    console.log({code})
    try {
        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
            params: {
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const accessToken = response.data.access_token;
        console.log({accessToken})
        // Use the access token as needed
        res.send('Access Token Obtained!');
    } catch (error) {
        console.error('Error obtaining access token:', error);
        res.status(500).send('Error obtaining access token');
    }
});

app.get('/openapi.json', (req, res) => {
    res.sendFile(path.join(__dirname, '/openapi.json'));
  });


app.get('/openapi.yaml', (req, res) => {
    try {
        // Read the YAML file
        const yamlPath = path.join(__dirname, 'openapi.yaml');
        const fileContents = fs.readFileSync(yamlPath, 'utf8');

        // Convert YAML to JSON (JavaScript Object)
        const jsonData = yaml.load(fileContents);

        // Send JSON response
        res.json(jsonData);
    } catch (e) {
        console.error(e);
        res.status(500).send('Internal Server Error');
    }
  });

app.get('/.well-known/ai-plugin.json', (req, res) => {
    res.sendFile(path.join(__dirname, '/.well-known/ai-plugin.json'));
  });
  

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})