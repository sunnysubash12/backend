let express = require('express');
let app = express();
const fs = require('fs');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const propertiesReader = require("properties-reader");
const path = require("path");
const propertiesPath = path.resolve(__dirname, "conf/db.properties");
const properties = propertiesReader(propertiesPath);
app.use(cors({ origin: "*" }));
app.use(express.json());
const StreamChat = require('stream-chat').StreamChat;
require('dotenv').config();


let dbPprefix = properties.get("db.prefix");
//for potential special characters
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params")
//URL-Encoding of User and PWD
const username = encodeURIComponent(properties.get("db.user"));
const pass = encodeURIComponent(properties.get("db.pwd"));
const uri = dbPprefix + username + ":" + pass + dbUrl + dbParams;
const db_name = properties.get("db.dbName");
const db_chat_collection_name = "users";
const db_chat_messages_collection_name = "messages";

const apiKey = 'twghaea6bwp3';
const apiSecret ="tay68ffasby47mrfyje7cnswrfn69pnta3n46eg9u32uze2mhp9q68he89y7ah72"; ;
console.log("API Key:", apiKey);
console.log("API Secret:", apiSecret ? "Loaded" : "Missing");
const serverClient = StreamChat.getInstance(apiKey, apiSecret)


const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });



const fetchusers = async (req, res) => {
    try{
    await client.connect();

    const db = client.db(db_name);

    const users_collection = db.collection(db_chat_collection_name);

    const fetchedusers = await users_collection.find({}).toArray();
    res.json(fetchedusers);
    }catch(err){
        res.status(500).json({ error: err.message }); 
    } finally{
        await client.close();
    }
}

// Generate Stream token for a user
const createStreamToken = async (req, res) => {
    const { _id } = req.body;
    await client.connect();

    if (!_id ) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const db = client.db(db_name);
        const token = await serverClient.createToken(_id.toString());
        res.json({ token });
    } catch (err) {
        console.error('Error generating token:', err); // Better error logging
        res.status(500).json({ error: 'Error generating token' });
    }
};

app.post('/revokeStreamUserToken', async (req, res) => {
    const { _id } = req.body;
    await client.connect();
  
    if (!_id) {
      return res.status(400).json({
        error: 'id not found',
      });
    }
  
    try {
      // Revoke the user token using StreamChat SDK
      await serverClient.revokeUserToken( _id);
      return res.status(200).send({
        message: 'Stream token revoked successfully',
      });
    } catch (err) {
      console.error('Error revoking Stream token:', err);
      return res.status(500).json({
        error: 'Could not revoke Stream user token',
      });
    }
  });

const fetchMessages = async (req, res) => {
    const { senderId, receiverId } = req.query;
    try {
        await client.connect();
        const db = client.db(db_name);
        const messages = await db.collection('messages').find({
          $or: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId }
          ]
        }).toArray();
        res.json(messages);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
};

app.post('/sendMessage', async (req, res) => {
    const { senderId, receiverId, message } = req.body;
    try {
        await client.connect();
        const db = client.db(db_name);
        await db.collection('messages').insertOne({ senderId, receiverId, message, timestamp: new Date() });
      res.status(201).json({ message: 'Message stored successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Routes
app.post('/createStreamToken', createStreamToken);
app.get('/messages', fetchMessages);
app.get("/users", fetchusers);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`started on port: ${port}`);
});