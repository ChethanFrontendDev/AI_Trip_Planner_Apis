import mongoose from "mongoose";

const initializeDatabase = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);

    if (connection) {
      console.log("MongoDB connected successfully.");
    }
  } catch (error) {
    console.log("Database connection failed", error);
    process.exit(1);
  }
};

export { initializeDatabase };
