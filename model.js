import mongoose from "mongoose";

const weatherSchema = new mongoose.Schema({

    city: {
        type: String,
        required: true
    },

    country: {
        type: String,
        required: true
    },

    date: {
        type: String,
        required: true
    },

    temperature: {
        type: Number,
        required: true
    },

    humidity: {
        type: Number,
        required: true
    },

    windSpeed: {
        type: Number,
        required: true
    },

    rainfall: {
        type: Number,
        required: true
    },

    weatherCondition: {
        type: String,
        required: true
    }

});

const Weather = mongoose.model("Weather", weatherSchema);

export { Weather };