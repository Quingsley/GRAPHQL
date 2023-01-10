const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { graphqlHTTP } = require("express-graphql");

const schema = require("./graphql/schema");
const resolver = require("./graphql/resolvers");

const PASSWORD = require("./utils/password").mongoPassword;
const auth = require("./middlewares/auth");
const clearImage = require("./utils/clear-image");

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype == "image/png" ||
    file.mimetype == "image/jpg" ||
    file.mimetype == "image/jpeg"
  ) {
    cb(null, true);
  }
  cb(null, false);
};

app.use(bodyParser.json()); //application/json

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use((errors, req, res, next) => {
  console.log("ERRORS ⚠️", errors);
  const status = errors.statusCode || 500;
  const message = errors.message;
  const data = errors.data;
  res.status(status).json({
    message: message,
    data: data,
  });
});

app.use(auth);
app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated");
  }

  if (!req.file) {
    return res.status(200).json({
      message: "No file picked",
    });
  }

  if (req.body.oldpath) {
    clearImage(req.body.oldpath);
  }
  return res
    .status(201)
    .json({ message: "File stored", path: req.file.path.replace(/\\/g, "/") });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: resolver,
    graphiql: true,
    customFormatErrorFn(error) {
      if (!error.originalError) {
        return error;
      }
      const data = error.originalError.data;
      const message = error.message || "An error occured!.";
      const statusCode = error.originalError.statusCode;
      return { message: message, statusCode: statusCode, data: data };
    },
  })
);

async function main() {
  try {
    const connect = await mongoose.connect(
      `mongodb+srv://quingsley:${PASSWORD}@cluster0.hkxyhxj.mongodb.net/messages?retryWrites=true`
    );
    if (connect) {
      app.listen("8080", () =>
        console.log("Sever running at http://localhost:8080")
      );
    }
  } catch (errors) {
    console.log(errors);
  }
}

main();
