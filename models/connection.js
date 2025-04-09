import mongoose from "mongoose";

export function mongoConnection() {
    try {
        mongoose.set("strictQuery", false);
        mongoose
            .connect(process.env.MONGO_DB_URL, {})
            .then(() => {
                console.log("Connected to MongoDB");
            })
            .catch((e) => {
                console.log("Cant Connect to MongoDB", e);
            });
    } catch (e) {
        console.log("Error in Connection", e);
    }
}
