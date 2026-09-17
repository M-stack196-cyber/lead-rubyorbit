import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: process.env.PORT || 5000,
  host: process.env.HOST || 'localhost',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
}
