import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import connectDB from './config/dbConnection.js'


const app = express()
app.use(express.json())
// connectDB()
const PORT = process.env.PORT || 3500

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
