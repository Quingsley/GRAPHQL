const fs = require("fs");
const path = require("path");

const clearImage = (imagePath) => {
  const p = path.join(__dirname, "../", imagePath);
  fs.unlink(p, (err) => console.log(err, "Image Deleted successfully"));
};

module.exports = clearImage;
