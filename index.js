const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ccm0dfs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("carequestDB");
    const usersCollection = db.collection("users");
    const testsCollection = db.collection("tests");
    const reviewsCollection = db.collection("reviews");
    const doctorsCollection = db.collection("doctors");
    const promotionsCollection = db.collection("promotions");
    const bookingsCollection = db.collection("bookings");
    const paymentsCollection = db.collection("payments");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      const authorization = req.headers.authorization;
      if (!authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const user = await usersCollection.findOne({ email });
      res.send({ admin: user?.role === "admin" });
    });

    app.get("/users/status/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      console.log("hiit", user);
      if (user) {
        console.log("get");
        res.send({ status: user.status, role: user.role });
      } else {
        res.status(404).send({ message: "User not found" });
        console.log("pai nai");
      }
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const updatedDoc = { $set: { role: "admin" } };
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          updatedDoc
        );
        res.send(result);
      }
    );

    app.get("/tests", async (req, res) => {
      const tests = await testsCollection.find().toArray();
      res.send(tests);
    });

    app.get("/tests/:id", async (req, res) => {
      const id = req.params.id;
      const test = await testsCollection.findOne({ _id: new ObjectId(id) });
      res.send(test);
    });

    app.delete("/tests/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await testsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/tests", async (req, res) => {
      const test = req.body;
      const result = await testsCollection.insertOne(test);
      res.send(result);
    });

    app.patch("/tests/:id", async (req, res) => {
      const id = req.params.id;
      const updatedDoc = { $set: req.body };
      const result = await testsCollection.updateOne(
        { _id: new ObjectId(id) },
        updatedDoc
      );
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollection.find().toArray();
      res.send(reviews);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      try {
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        console.error("Error inserting review:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/doctors", async (req, res) => {
      const doctors = await doctorsCollection.find().toArray();
      res.send(doctors);
    });

    app.get("/promotions", async (req, res) => {
      const promotions = await promotionsCollection.find().toArray();
      res.send(promotions);
    });

    // app.get("/bookings", verifyToken, async (req, res) => {
    //   const email = req.decoded.email;
    //   const user = await usersCollection.findOne({ email });
    //   let bookings;
    //   if (user && user.role === "admin") {
    //     bookings = await bookingsCollection.find().toArray();
    //   } else {
    //     bookings = await bookingsCollection.find({ email }).toArray();
    //   }
    //   res.send(bookings);
    // });

    app.get("/bookings", verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const bookings = await bookingsCollection.find().toArray();
      res.send(bookings);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
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
          const updatedDoc = { $set: { status, report } };
          const result = await bookingsCollection.updateOne(
            { _id: new ObjectId(id) },
            updatedDoc
          );
          res.send(result);
        } catch (error) {
          console.error("Error updating booking status:", error);
          res.status(500).send({ message: "Internal server error" });
        }
      }
    );

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // payment
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      console.log("payment info", payment);
      res.send(paymentResult);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensuring the MongoDB connection is closed when the server stops
    process.on("SIGINT", async () => {
      await client.close();
      process.exit(0);
    });
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Carequest is sitting");
});

app.listen(port, () => {
  console.log(`Carequest is sitting on port ${port}`);
});
