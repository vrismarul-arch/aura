import { Router } from "express";

import Product from "../models/Product.js";
import Category from "../models/Category.js";

import { protect, adminOnly } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

import {
  uploadImage,
  deleteImageByUrl,
} from "../utils/storage.js";

const router = Router();

/* =========================================================
   HELPERS
========================================================= */

const escapeRegex = (value = "") => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
};

const parseJSON = (value, fallback = []) => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/* =========================================================
   CATEGORY VALIDATION
========================================================= */

async function validateCategory(category, subcategory) {
  const cat = await Category.findOne({ key: category });

  if (!cat) {
    return "Invalid category";
  }

  if (
    subcategory &&
    !cat.subcategories.some(
      (item) => item.key === subcategory
    )
  ) {
    return "Invalid subcategory for this category";
  }

  return null;
}

/* =========================================================
   GROUP UPLOADED FILES
========================================================= */

function getFilesByField(files = []) {
  const result = {};

  for (const file of files) {
    if (!result[file.fieldname]) {
      result[file.fieldname] = [];
    }

    result[file.fieldname].push(file);
  }

  return result;
}

/* =========================================================
   GET ALL PRODUCTS - ADMIN
========================================================= */

router.get(
  "/admin/all",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const {
        category,
        subcategory,
        search,
        minPrice,
        maxPrice,
        status,
        sort = "featured",
      } = req.query;

      const filter = {};

      if (category) {
        filter.category = {
          $in: String(category).split(","),
        };
      }

      if (subcategory) {
        filter.subcategory = {
          $in: String(subcategory).split(","),
        };
      }

      if (search) {
        filter.name = {
          $regex: escapeRegex(String(search).trim()),
          $options: "i",
        };
      }

      if (minPrice || maxPrice) {
        filter.price = {};

        if (minPrice) {
          filter.price.$gte = Number(minPrice);
        }

        if (maxPrice) {
          filter.price.$lte = Number(maxPrice);
        }
      }

      if (status === "active") {
        filter.isActive = true;
      }

      if (status === "inactive") {
        filter.isActive = false;
      }

      const sortMap = {
        featured: { featured: -1, id: 1 },
        "low-high": { price: 1 },
        "high-low": { price: -1 },
        "a-z": { name: 1 },
        "z-a": { name: -1 },
        newest: { createdAt: -1 },
      };

      const page = Math.max(
        1,
        Number(req.query.page) || 1
      );

      const limit = Math.min(
        100,
        Number(req.query.limit) || 100
      );

      const [products, total] = await Promise.all([
        Product.find(filter)
          .collation({ locale: "en" })
          .sort(sortMap[sort] || sortMap.featured)
          .skip((page - 1) * limit)
          .limit(limit),

        Product.countDocuments(filter),
      ]);

      res.json({
        total,
        page,
        pages: Math.ceil(total / limit),
        products,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   GET PUBLIC PRODUCTS
========================================================= */

router.get("/", async (req, res, next) => {
  try {
    const {
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      sort = "featured",
    } = req.query;

    const filter = {
      isActive: { $ne: false },
    };

    if (category) {
      filter.category = {
        $in: String(category).split(","),
      };
    }

    if (subcategory) {
      filter.subcategory = {
        $in: String(subcategory).split(","),
      };
    }

    if (search) {
      filter.name = {
        $regex: escapeRegex(String(search).trim()),
        $options: "i",
      };
    }

    if (minPrice || maxPrice) {
      filter.price = {};

      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    const sortMap = {
      featured: { featured: -1, id: 1 },
      "low-high": { price: 1 },
      "high-low": { price: -1 },
      "a-z": { name: 1 },
      "z-a": { name: -1 },
    };

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Number(req.query.limit) || 100
    );

    const [items, total] = await Promise.all([
      Product.find(filter)
        .collation({ locale: "en" })
        .sort(sortMap[sort] || sortMap.featured)
        .skip((page - 1) * limit)
        .limit(limit),

      Product.countDocuments(filter),
    ]);

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      products: items,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   GET SINGLE PRODUCT
========================================================= */

router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findOne({
      id: Number(req.params.id),
    });

    if (!product || product.isActive === false) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    /* Only active variants returned */
    const productJSON = product.toObject();

    productJSON.variants = (
      productJSON.variants || []
    ).filter((variant) => variant.isActive !== false);

    const same = await Product.find({
      category: product.category,
      id: { $ne: product.id },
      isActive: { $ne: false },
    }).limit(5);

    let related = same;

    if (related.length < 5) {
      const others = await Product.find({
        category: { $ne: product.category },
        id: { $ne: product.id },
        isActive: { $ne: false },
      }).limit(5 - related.length);

      related = [...same, ...others];
    }

    res.json({
      product: productJSON,
      related,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   CREATE PRODUCT
========================================================= */

router.post(
  "/",
  protect,
  adminOnly,
  upload.any(),
  async (req, res, next) => {
    try {
      const {
        name,
        price,
        category,
        subcategory = "",
        description = "",
        stock,
        featured,
        isActive,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "Product name is required",
        });
      }

      if (!category) {
        return res.status(400).json({
          message: "Category is required",
        });
      }

      const categoryError = await validateCategory(
        category,
        subcategory
      );

      if (categoryError) {
        return res.status(400).json({
          message: categoryError,
        });
      }

      const filesByField = getFilesByField(
        req.files || []
      );

      /* MAIN PRODUCT IMAGES */
      const mainFiles = filesByField.images || [];

      const mainImageUrls = await Promise.all(
        mainFiles.map((file) => uploadImage(file))
      );

      /* VARIANTS */
      let variants = parseJSON(req.body.variants, []);

      if (!Array.isArray(variants)) {
        variants = [];
      }

      const finalVariants = [];

      for (
        let index = 0;
        index < variants.length;
        index++
      ) {
        const variant = variants[index] || {};

        const variantFiles =
          filesByField[`variantImages_${index}`] || [];

        const variantUrls = await Promise.all(
          variantFiles.map((file) => uploadImage(file))
        );

        const existingImages = Array.isArray(
          variant.existingImages
        )
          ? variant.existingImages
          : [];

        const allVariantImages = [
          ...existingImages,
          ...variantUrls,
        ];

        finalVariants.push({
          color: variant.color || "",
          image: allVariantImages[0] || "",
          images: allVariantImages,
          isActive: variant.isActive !== false,
        });
      }

      /* NEXT PRODUCT ID */
      const lastProduct = await Product.findOne()
        .sort({ id: -1 })
        .lean();

      const nextId = lastProduct
        ? Number(lastProduct.id) + 1
        : 1;

      /* CREATE PRODUCT */
      const product = await Product.create({
        id: nextId,
        name: name.trim(),
        price: Number(price) || 0,
        category,
        subcategory,
        description,
        stock:
          stock !== undefined ? Number(stock) : 100,
        featured: parseBoolean(featured, false),
        isActive: parseBoolean(isActive, true),
        image: mainImageUrls[0] || "",
        images: mainImageUrls,
        variants: finalVariants,
        hasVariants: finalVariants.length > 0,
      });

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   UPDATE PRODUCT
========================================================= */

router.put(
  "/:id",
  protect,
  adminOnly,
  upload.any(),
  async (req, res, next) => {
    try {
      const product = await Product.findOne({
        id: Number(req.params.id),
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const newCategory =
        req.body.category ?? product.category;

      let newSubcategory = product.subcategory;

      if (req.body.subcategory !== undefined) {
        newSubcategory = req.body.subcategory;
      } else if (newCategory !== product.category) {
        newSubcategory = "";
      }

      const categoryError = await validateCategory(
        newCategory,
        newSubcategory
      );

      if (categoryError) {
        return res.status(400).json({
          message: categoryError,
        });
      }

      product.category = newCategory;
      product.subcategory = newSubcategory;

      /* BASIC FIELDS */
      if (req.body.name !== undefined) {
        product.name = req.body.name;
      }

      if (req.body.description !== undefined) {
        product.description = req.body.description;
      }

      if (req.body.price !== undefined) {
        product.price = Number(req.body.price);
      }

      if (req.body.stock !== undefined) {
        product.stock = Number(req.body.stock);
      }

      if (req.body.featured !== undefined) {
        product.featured = parseBoolean(
          req.body.featured,
          product.featured
        );
      }

      if (req.body.isActive !== undefined) {
        product.isActive = parseBoolean(
          req.body.isActive,
          product.isActive
        );
      }

      /* MAIN IMAGES */
      const filesByField = getFilesByField(
        req.files || []
      );

      const mainFiles = filesByField.images || [];

      if (mainFiles.length) {
        const newUrls = await Promise.all(
          mainFiles.map((file) => uploadImage(file))
        );

        product.images = [
          ...(product.images || []),
          ...newUrls,
        ];

        if (!product.image) {
          product.image = newUrls[0];
        }
      }

      /* VARIANTS */
      if (req.body.variants !== undefined) {
        let incomingVariants = parseJSON(
          req.body.variants,
          []
        );

        if (!Array.isArray(incomingVariants)) {
          incomingVariants = [];
        }

        const oldVariants = product.variants || [];
        const finalVariants = [];

        for (
          let index = 0;
          index < incomingVariants.length;
          index++
        ) {
          const variant = incomingVariants[index] || {};

          const oldVariant = variant._id
            ? oldVariants.id(variant._id)
            : null;

          const variantFiles =
            filesByField[`variantImages_${index}`] || [];

          const uploadedUrls = await Promise.all(
            variantFiles.map((file) => uploadImage(file))
          );

          const existingImages = Array.isArray(
            variant.existingImages
          )
            ? variant.existingImages
            : oldVariant
            ? oldVariant.images || []
            : [];

          const combinedImages = [
            ...existingImages,
            ...uploadedUrls,
          ];

          finalVariants.push({
            _id: variant._id || undefined,
            color: variant.color || "",
            image: combinedImages[0] || "",
            images: combinedImages,
            isActive: variant.isActive !== false,
          });
        }

        product.variants = finalVariants;
        product.hasVariants = finalVariants.length > 0;
      }

      await product.save();

      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PRODUCT ACTIVE / INACTIVE
========================================================= */

router.patch(
  "/:id/status",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be boolean",
        });
      }

      const product = await Product.findOneAndUpdate(
        { id: Number(req.params.id) },
        { $set: { isActive } },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      res.json({
        message: isActive
          ? "Product activated"
          : "Product deactivated",
        product,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   VARIANT ACTIVE / INACTIVE
========================================================= */

router.patch(
  "/:id/variants/:variantId/status",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be boolean",
        });
      }

      const product = await Product.findOne({
        id: Number(req.params.id),
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const variant = product.variants.id(
        req.params.variantId
      );

      if (!variant) {
        return res.status(404).json({
          message: "Variant not found",
        });
      }

      variant.isActive = isActive;

      await product.save();

      res.json({
        message: isActive
          ? "Variant activated"
          : "Variant deactivated",
        product,
        variant,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DELETE PRODUCT
========================================================= */

router.delete(
  "/:id",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const product = await Product.findOneAndDelete({
        id: Number(req.params.id),
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const mainImages = [...(product.images || [])];

      const variantImages = [];

      for (const variant of product.variants || []) {
        variantImages.push(...(variant.images || []));
      }

      const allImages = [
        ...mainImages,
        ...variantImages,
      ].filter(Boolean);

      await Promise.all(
        allImages.map((url) =>
          deleteImageByUrl(url).catch(() => null)
        )
      );

      res.json({
        message: "Product deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;