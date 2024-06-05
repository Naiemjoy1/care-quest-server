const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

//* middleware
//Must remove "/" from your production URL
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);
app.use(express.json());

//* mongo

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ccm0dfs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const userssCollection = client.db("carequestDB").collection("users");
    const testsCollection = client.db("carequestDB").collection("tests");
    const reviewsCollection = client.db("carequestDB").collection("reviews");
    const doctorsCollection = client.db("carequestDB").collection("doctors");
    const promotionsCollection = client
      .db("carequestDB")
      .collection("promotions");
    const bookingsCollection = client.db("carequestDB").collection("bookings");

    // user
    app.get("/users", async (req, res) => {
      const result = await userssCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const exitingUser = await userssCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exits", insertedId: null });
      }
      const result = await userssCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userssCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userssCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // tests
    app.get("/tests", async (req, res) => {
      const result = await testsCollection.find().toArray();
      res.send(result);
    });

    app.get("/tests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testsCollection.findOne(query);
      res.send(result);
    });

    // reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // doctors
    app.get("/doctors", async (req, res) => {
      const result = await doctorsCollection.find().toArray();
      res.send(result);
    });

    // promotions
    app.get("/promotions", async (req, res) => {
      const result = await promotionsCollection.find().toArray();
      res.send(result);
    });

    // booking
    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const bookTest = req.body;
      const result = await bookingsCollection.insertOne(bookTest);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // The listener will now close the client when the app is stopped
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("carequest is sitting");
});

app.listen(port, () => {
  console.log(`carequest is sitting on port ${port}`);
});
