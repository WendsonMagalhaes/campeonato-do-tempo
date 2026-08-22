import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';

console.log(`API_KEY present: ${Boolean(API_KEY)}, MODEL: ${MODEL}`);
