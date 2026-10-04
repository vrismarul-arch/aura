import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 50,
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (
      allowed.includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, PNG and WEBP images are allowed"
        )
      );
    }
  },
});