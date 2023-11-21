const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios')
const app = express();
const cheerio = require('cheerio')

const CLIENT_ID = '86evj6mojpyxvv';
const CLIENT_SECRET = 'XLbTDKBqLYHo6n51';
const REDIRECT_URI = 'http://localhost:3001/auth/linkedin/callback';

// Enable CORS for all routes
app.use(cors());
const port = 3001

const accessTokeMapByConversation = new Map()

async function scrapeLinkedInProfile(url) {
  try {
    // Fetch the HTML of the page
    const response = await axios.get(url);
    console.log({response})
    const $ = cheerio.load(response.data);

    // Parse and extract data as needed
    // For example, extracting the bio:
    const bio = $('#bio-id').text();

    // Create a JSON object with the extracted data
    const profileData = {
      bio: bio,
      // Add other fields as needed
    };

    // Return or process the JSON data
    return profileData;
  } catch (error) {
    console.error('Error scraping LinkedIn:', error);
  }
}


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

app.get('/userProfile', async (req, res) => {
  const url = req.query.url
  const conversationId = req.headers['openai-conversation-id'] || ''
  const access_token = accessTokeMapByConversation.get(conversationId)
  try {
    // Make a request to get my own profile
    const headers = {
      Authorization: `Bearer ${access_token}`,
      'X-RestLi-Protocol-Version': '2.0.0' // Required by LinkedIn for certain API calls
    };
    
    // Making the request to retrieve the current member's profile
    axios.get('https://api.linkedin.com/v2/people/(id:{profile ID})?projection=(id,firstName,lastName)', { headers: headers })
      .then(response => {
        // Handle the response data
        console.log(response.data);
      })
      .catch(error => {
        // Handle any errors
        console.error('Error making API request:', error);
      });
  }catch(e){
    console.log(e)
    res.status(200).send()
  }  
})


// Route to start the OAuth flow
app.get('/auth/linkedin', (req, res) => {
  // Every conversation needs to have an access token
  const conversationId = req.headers['openai-conversation-id'] || ''
  const linkedInAuthURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${conversationId}&scope=openid%20profile%20w_member_social%20email`;
  res.json({redirectUrl: linkedInAuthURL});
});


// Callback route
app.get('/auth/linkedin/callback', async (req, res) => {
    const code = req.query.code;
    const conversationId = req.query.state
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

        const meProfileResponse = await axios.get('https://api.linkedin.com/v2/me', { headers: headers })
        const personId = response.data.id

        // get profile with `https://api.linkedin.com/v2/people/(id:${personID})`

        const accessToken = response.data.access_token;
        accessTokeMapByConversation.set(conversationId, accessToken)
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