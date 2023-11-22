const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios')
const app = express();
const cheerio = require('cheerio')
const FormData = require('form-data');
const fsPromise = require('fs/promises');


const CLIENT_ID = '86evj6mojpyxvv';
const CLIENT_SECRET = 'XLbTDKBqLYHo6n51';
const REDIRECT_URI = 'https://custom-gpt-01.onrender.com/auth/linkedin/callback';

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
const port = 3001

const accessTokeMapByConversation = new Map()

async function scrapeLinkedInProfile(url) {
  try {
    // Fetch the HTML of the page
    const response = await axios.get(url);
    console.log({ response })
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
  res.json({ todos })
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
  } catch (e) {
    console.log(e)
    res.status(200).send()
  }
})


// Route to start the OAuth flow
app.get('/auth/linkedin', (req, res) => {
  // Every conversation needs to have an access token
  const conversationId = req.headers['openai-conversation-id'] || ''
  console.log(req.headers)
  const linkedInAuthURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${conversationId}&scope=openid%20profile%20w_member_social%20email%20email`;
  console.log(conversationId)
  res.json({ redirectUrl: linkedInAuthURL })
});

app.post('/post/text', async (req, res) => {
  const conversationId = req.headers['openai-conversation-id'] || ''
  console.log({conversationId})
  console.log(accessTokeMapByConversation)
  const { userURN } = accessTokeMapByConversation.get(conversationId)
  const today = new Date()
  const { customText } = req.body
  const textPost = {
    "author": `urn:li:person:${userURN}`,
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": customText
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  }

  try {
    const testTextPost = await axios.post('https://api.linkedin.com/v2/ugcPosts', textPost, {
      headers: userInfoHeaders
    })
    res.status(200).send()
  } catch (e) {
    res.status(500).send()
  }
})

app.post('/post/article', async (req, res) => {

  const artilcePost = {
    "author": `urn:li:person:${userURN}`,
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "Learning more about LinkedIn by reading the LinkedIn Blog!"
        },
        "shareMediaCategory": "ARTICLE",
        "media": [
          {
            "status": "READY",
            "description": {
              "text": "Official LinkedIn Blog - Your source for insights and information about LinkedIn."
            },
            "originalUrl": "https://blog.linkedin.com/",
            "title": {
              "text": "Official LinkedIn Blog"
            }
          }
        ]
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  }
  try {
    const testTextPost = await axios.post('https://api.linkedin.com/v2/ugcPosts', textPost, {
      headers: userInfoHeaders
    })
    res.status(200).send()
  } catch (e) {
    res.status(500).send()
  }

})

app.post('/post/imageShare', async (req, res) => {
  
  const conversationId = req.headers['openai-conversation-id'] || ''
  const { userURN, accessToken } = accessTokeMapByConversation.get(conversationId)
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0'
  }

  const registerImageBody = {
    "registerUploadRequest": {
      "recipes": [
        "urn:li:digitalmediaRecipe:feedshare-image"
      ],
      "owner": `urn:li:person:${userURN}`,
      "serviceRelationships": [
        {
          "relationshipType": "OWNER",
          "identifier": "urn:li:userGeneratedContent"
        }
      ]
    }
  }
  try {
    const imageRegistrationResponse = await axios.post('https://api.linkedin.com/v2/ugcPosts', textPost, {
      headers: userInfoHeaders
    })
    const { value } = imageRegistrationResponse.data
    const uploadUrl = value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl
    const imageMedia = value.asset

    // Read image from disk as a Buffer
    const image = await fsPromise.readFile('./stickers.jpg');

    // Create a form and append image with additional fields
    const form = new FormData();
    form.append('postImage', image, 'stickers.jpg');

    // Send form data with axios
    const imagePostResponse = await axios.post('https://example.com', form, {
      headers,
    });

    const imageSharePostBody = {
      "author":`urn:li:person:${userURN}`,
      "lifecycleState": "PUBLISHED",
      "specificContent": {
          "com.linkedin.ugc.ShareContent": {
              "shareCommentary": {
                  "text": "CustomGPT #1 Got a photo that was created by Dalle and uploaded it to LinkeIn then created a post from the generated image."
              },
              "shareMediaCategory": "IMAGE",
              "media": [
                  {
                      "status": "READY",
                      "description": {
                          "text": "Generated DALLE Image!"
                      },
                      "media": imageMedia,
                      "title": {
                          "text": "LinkedIn Talent Connect 2021"
                      }
                  }
              ]
          }
      },
      "visibility": {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
  }
    res.status(200).send()
  } catch (e) {
    res.status(500).send()
  }
})

// Callback route
app.get('/auth/linkedin/callback', async (req, res) => {
  const code = req.query.code;
  const conversationId = req.query.state
  console.log(" ================ ")
  console.log({query: req.query})
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

    const userInfoHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0'
    }

    const userInfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: userInfoHeaders
    })


    const idToken = response.data.id_token;
    const userURN = userInfoResponse.data.sub
    const tokens = {
      accessToken,
      idToken,
      userURN
    }
    console.log({tokens})
    accessTokeMapByConversation.set(conversationId, tokens)
    res.redirect(`https://chat.openai.com/g/g-rjOQjMfZB-larry/c/${conversationId}`)
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

app.get('/privacy', (req, res) => {
  // You can specify your privacy policy content here as a string
  const privacyPolicy = `
    Privacy Policy for Your App

    This Privacy Policy describes how your data is collected, used, and shared when you use our app.

    Information We Collect:
    - When you log in with your LinkedIn profile, we collect public information from your LinkedIn profile, including your name, profile picture, and other publicly available details.
    - We may use this information to provide you with personalized suggestions and improve your experience.

    Data Security:
    - We take data security seriously and implement measures to protect your information.

    Data Sharing:
    - We do not share your personal information with third parties without your consent.

    Your Choices:
    - You can choose to log out of your LinkedIn profile at any time.

    Contact Us:
    - If you have any questions or concerns about your privacy, you can contact us at [your contact email].

    This Privacy Policy may be updated from time to time. Please review it periodically.

    Last updated: [Date]

    `;

  // Set the response content type to plain text
  res.setHeader('Content-Type', 'text/plain');

  // Send the privacy policy as the response
  res.send(privacyPolicy);
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})