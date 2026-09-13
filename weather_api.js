import express from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { Weather } from "./model.js";

const ai = new GoogleGenAI({
    apiKey: "*****"
});

export const weatherApi = express.Router();

// POST /weather_api/predict
weatherApi.post("/getweather", async (req, res) => {

    try {

        // Get city name from request
        const { city } = req.body;

        // 1. Check whether city was entered
        if (!city || city.trim() === "") {

            return res.status(400).json({
                success: false,
                message: "Please enter a city name"
            });

        }


        // 2. Find the city using Open-Meteo Geocoding API
        const locationResponse = await axios.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            {
                params: {
                    name: city,
                    count: 1,
                    language: "en",
                    format: "json"
                }
            }
        );

        // 3. Check whether city exists
        if (
            !locationResponse.data.results ||
            locationResponse.data.results.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message: "City not found"
            });

        }


        // Get location information
        const location = locationResponse.data.results[0];

        const latitude = location.latitude;
        const longitude = location.longitude;

        const cityName = location.name;
        const country = location.country;


        // 4. Get previous 10 days weather data
        const weatherResponse = await axios.get(
            "https://archive-api.open-meteo.com/v1/archive",
            {
                params: {

                    // Used internally by Open-Meteo
                    latitude: latitude,
                    longitude: longitude,

                    // Previous 10 complete days
                    start_date: getDate(-10),
                    end_date: getDate(-1),

                    daily: [
                        "temperature_2m_mean",
                        "relative_humidity_2m_mean",
                        "wind_speed_10m_mean",
                        "precipitation_sum",
                        "weather_code"
                    ].join(","),

                    timezone: "auto"
                }
            }
        );


        // 5. Get daily weather data
        const daily = weatherResponse.data.daily;


        // 6. Convert API response into our format
        const historicalData = daily.time.map((date, index) => {

            return {

                date: date,

                temperature:
                    daily.temperature_2m_mean[index],

                humidity:
                    daily.relative_humidity_2m_mean[index],

                windSpeed:
                    daily.wind_speed_10m_mean[index],

                rainfall:
                    daily.precipitation_sum[index],

                weatherCondition:
                    getWeatherCondition(
                        daily.weather_code[index]
                    )

            };

        });


        // 7. Save data in MongoDB
        const weatherDocuments = historicalData.map((data) => {

            return {

                city: cityName,

                country: country,

                date: data.date,

                temperature: data.temperature,

                humidity: data.humidity,

                windSpeed: data.windSpeed,

                rainfall: data.rainfall,

                weatherCondition: data.weatherCondition

            };

        });
         const savedData = await Weather.insertMany(weatherDocuments);

        const prompt = `${JSON.stringify(historicalData, null, 2)}`;

        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt
        });

        const prediction = response.text;

        // 8. Send response to Postman/frontend
        res.status(200).json({

            success: true,

            message: "Weather data retrieved and stored successfully",

            city: cityName,

            country: country,

            historicalData: historicalData,

            prediction: prediction

        });


    } catch (err) {

        console.log("Weather API error:", err.message);

        res.status(500).json({

            success: false,

            message: "Unable to retrieve weather data"

        });

    }
   
});


// Function to calculate dates
function getDate(daysFromToday) {

    const date = new Date();

    date.setDate(
        date.getDate() + daysFromToday
    );

    return date.toISOString().split("T")[0];

}


// Convert Open-Meteo weather codes into readable conditions
function getWeatherCondition(code) {

    if (code === 0) {
        return "Clear sky";
    }

    if ([1, 2, 3].includes(code)) {
        return "Cloudy";
    }

    if ([45, 48].includes(code)) {
        return "Foggy";
    }

    if ([51, 53, 55, 56, 57].includes(code)) {
        return "Drizzle";
    }

    if ([61, 63, 65, 66, 67].includes(code)) {
        return "Rain";
    }

    if ([71, 73, 75, 77].includes(code)) {
        return "Snow";
    }

    if ([80, 81, 82].includes(code)) {
        return "Rain showers";
    }

    if ([95, 96, 99].includes(code)) {
        return "Thunderstorm";
    }

    return "Unknown";
}