const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const app = express();

// Enable CORS for all routes
app.use(cors());
const port = 3001

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/todos', async (req, res) => {
    console.log("we are here")
    const todos = [
        "This is the first todo",
        "This is the second todo"
    ]
    res.json({todos})
})

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