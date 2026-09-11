import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const transcribeVoice = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Audio file required' });
      return;
    }

    const form = new FormData();
    form.append('audio', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${AI_BASE}/ai/voice/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Voice transcription error:', error);
    res.status(500).json({ success: false, message: 'Voice transcription failed' });
  }
};

export const extractProductInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, language } = req.body;

    const response = await axios.post(`${AI_BASE}/ai/voice/extract-product`, {
      text, language,
    }, { timeout: 30000 });

    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Product extraction failed' });
  }
};

export const removeBackground = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Image file required' });
      return;
    }

    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${AI_BASE}/ai/image/remove-bg`, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    fs.unlinkSync(req.file.path);

    res.set('Content-Type', 'image/png');
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Background removal failed' });
  }
};

export const enhanceImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Image file required' });
      return;
    }

    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${AI_BASE}/ai/image/enhance`, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    fs.unlinkSync(req.file.path);

    res.set('Content-Type', 'image/jpeg');
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Image enhancement failed' });
  }
};

export const generateCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productInfo, language } = req.body;

    const response = await axios.post(`${AI_BASE}/ai/catalog/generate`, {
      productInfo, language,
    }, { timeout: 60000 });

    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Catalog generation failed' });
  }
};

export const aiHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(`${AI_BASE}/health`, { timeout: 5000 });
    res.json({ success: true, aiService: response.data });
  } catch {
    res.status(503).json({ success: false, message: 'AI service unavailable' });
  }
};
