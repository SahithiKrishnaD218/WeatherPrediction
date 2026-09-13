import exp from "express";
import cors from "cors";
import {connect} from "mongoose";
import {weatherApi} from "./weather_api.js";

const app = exp();
app.use(cors());
app.use(exp.json());
app.use("/weather_api",weatherApi); 

// Connect to MongoDB
async function connectDB(){
    try{
        await connect("mongodb://localhost:27017/weather_prediction") 
        console.log("DB connected successfully")
        app.listen(6000,()=>console.log("server listening on port 6000"))

    } catch(err) {
        console.log("Error in DB connection",err.message)
    }
}

connectDB();

app.use((err,req,res,next)=>{
    console.log("err:",err)
     res.status(500).json({success:false,message:"Error occurred",data:err})
}) 