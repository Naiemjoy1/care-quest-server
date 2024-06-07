const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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

    const usersCollection = client.db("carequestDB").collection("users");
    const testsCollection = client.db("carequestDB").collection("tests");
    const reviewsCollection = client.db("carequestDB").collection("reviews");
    const doctorsCollection = client.db("carequestDB").collection("doctors");
    const promotionsCollection = client
      .db("carequestDB")
      .collection("promotions");
    const bookingsCollection = client.db("carequestDB").collection("bookings");

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // user
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/users/status/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        res.send({ status: user.status, role: user.role }); // Send both status and role
      } else {
        res.status(404).send({ message: "User not found" });
      }
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const exitingUser = await usersCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exits", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(query, updatedDoc);
        res.send(result);
      }
    );

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

    app.delete("/tests/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/tests", async (req, res) => {
      const item = req.body;
      const result = await testsCollection.insertOne(item);
      res.send(result);
    });

    app.patch("/tests/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          image: item.image,
          description: item.description,
          price: item.price,
          date: item.date,
          category: item.category,
          capacity: item.capacity,
          slots: item.slots,
        },
      };
      const result = await testsCollection.updateOne(filter, updatedDoc);
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
    // app.get("/bookings", async (req, res) => {
    //   const email = req.query.email;
    //   const query = { email: email };
    //   const result = await bookingsCollection.find(query).toArray();
    //   res.send(result);
    // });

    // app.get("/bookings/all", verifyToken, verifyAdmin, async (req, res) => {
    //   const result = await bookingsCollection.find().toArray();
    //   res.send(result);
    // });

    app.get("/bookings", verifyToken, async (req, res) => {
      // Check if the request is made by an admin
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user.role === "admin") {
        const result = await bookingsCollection.find().toArray(); // Fetch all bookings
        res.send(result);
      } else {
        // If not admin, fetch bookings based on user's email
        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
      }
    });

    app.post("/bookings", async (req, res) => {
      const bookTest = req.body;
      const result = await bookingsCollection.insertOne(bookTest);
      res.send(result);
    });

    app.patch(
      "/bookings/status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const { status, report } = req.body;
          const query = { _id: new ObjectId(id) };
          const updatedDoc = {
            $set: {
              status: status,
              report: report, // Store report data along with status
            },
          };
          const result = await bookingsCollection.updateOne(query, updatedDoc);
          res.send(result);
        } catch (error) {
          console.error("Error updating booking status:", error);
          res.status(500).send({ message: "Internal server error" });
        }
      }
    );

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"], // <-- Corrected parameter name
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
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
