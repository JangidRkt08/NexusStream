import { stringify } from "flatted";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    console.error("Error:", err);
    res.status(err.code || 500).json({
      success: false,
      message: err.message,
    });
  }
};

// const asyncHandler = (requesthandler) => {
//     (req, res, next) => {
//         Promise.resolve(requesthandler(req, res, next)).catch((err)=>next(err))
//     }
//  }

export { asyncHandler };
