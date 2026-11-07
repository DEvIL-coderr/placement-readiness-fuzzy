import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { JWT_SECRET } from './middleware/auth.js';

JWT_SECRET(); // fail fast if misconfigured
const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/placement_readiness';
const port = Number(process.env.PORT ?? 5000);

await mongoose.connect(uri);
createApp().listen(port, () => console.log(`API listening on :${port} (db: ${mongoose.connection.name})`));
