import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';
import Draft, { IDraftImages, IDraftSpecs } from '../models/Draft';
import { saveBase64Image, saveBufferImage } from '../utils/storage.util';

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
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Voice transcription error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.set('Content-Type', 'image/png');
    res.send(response.data);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.set('Content-Type', 'image/jpeg');
    res.send(response.data);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

/**
 * Full AI Product Studio Pipeline + Save to Draft Storage
 * 1. Takes artisan product photo
 * 2. Runs AI Studio pipeline (BiRefNet bg removal + CLAHE enhancement + 1024x1024 ecommerce canvas)
 * 3. Persists generated images to /uploads/drafts/
 * 4. Optionally extracts product specs if text/prompt is given
 * 5. Creates or updates Draft model
 */
export const processStudioAndSaveDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Product image file is required' });
      return;
    }

    const artisanId = req.userId;
    const { draftId, descriptionText, title } = req.body;
    let inputSpecs: Partial<IDraftSpecs> = {};
    if (req.body.specs) {
      try {
        inputSpecs = typeof req.body.specs === 'string' ? JSON.parse(req.body.specs) : req.body.specs;
      } catch {
        inputSpecs = {};
      }
    }

    // Read original file buffer
    const originalBuffer = fs.readFileSync(req.file.path);

    // 1. Save original to disk storage
    const originalUrl = await saveBufferImage(
      originalBuffer,
      req.file.originalname,
      'orig',
      'drafts'
    );

    // 2. Send image to AI Service full pipeline
    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const aiResponse = await axios.post(`${AI_BASE}/ai/image/process-complete`, form, {
      headers: form.getHeaders(),
      timeout: 180000,
    });

    // Remove local temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const aiData = aiResponse.data.data;
    if (!aiData || !aiData.ecommerce_ready) {
      throw new Error('AI studio failed to return enhanced images');
    }

    // 3. Persist AI-generated images to disk storage
    const noBgUrl = await saveBase64Image(aiData.no_background, 'nobg', 'drafts');
    const enhancedUrl = await saveBase64Image(aiData.enhanced, 'enh', 'drafts');
    const ecommerceReadyUrl = await saveBase64Image(aiData.ecommerce_ready, 'ecom', 'drafts');

    const draftImages: IDraftImages = {
      original: originalUrl,
      noBackground: noBgUrl,
      enhanced: enhancedUrl,
      ecommerceReady: ecommerceReadyUrl,
      selectedPrimary: 'ecommerceReady',
    };

    // 4. Optionally extract product specs using Qwen if description provided
    let extractedSpecs: Record<string, any> = {};
    if (descriptionText && (!inputSpecs.name || !inputSpecs.category)) {
      try {
        const specResponse = await axios.post(`${AI_BASE}/ai/voice/extract-product`, {
          text: descriptionText,
          language: req.body.language || 'en',
        }, { timeout: 45000 });
        if (specResponse.data?.data) {
          extractedSpecs = specResponse.data.data;
        }
      } catch (err) {
        console.warn('Auto spec extraction during studio skipped:', err);
      }
    }

    const mergedSpecs: IDraftSpecs = {
      name: inputSpecs.name || extractedSpecs.name || title,
      nameHindi: inputSpecs.nameHindi || extractedSpecs.name_hi,
      description: inputSpecs.description || extractedSpecs.description_en || descriptionText,
      descriptionHindi: inputSpecs.descriptionHindi || extractedSpecs.description_hi,
      category: inputSpecs.category || extractedSpecs.category || 'crafts',
      subCategory: inputSpecs.subCategory || extractedSpecs.subCategory,
      materials: inputSpecs.materials || extractedSpecs.materials || [],
      craftTechnique: inputSpecs.craftTechnique || extractedSpecs.craft_technique,
      colors: inputSpecs.colors || extractedSpecs.colors || [],
      dimensions: inputSpecs.dimensions || extractedSpecs.dimensions,
      price: inputSpecs.price || extractedSpecs.price,
      suggestedPrice: inputSpecs.suggestedPrice || extractedSpecs.suggestedPrice,
      tags: inputSpecs.tags || extractedSpecs.tags || [],
      careInstructions: inputSpecs.careInstructions || extractedSpecs.care_instructions || [],
      keyFeatures: inputSpecs.keyFeatures || extractedSpecs.key_features || [],
      region: inputSpecs.region || extractedSpecs.region,
    };

    // 5. Create or update Draft record
    let draft;
    if (draftId) {
      draft = await Draft.findOne({ _id: draftId, artisanId });
      if (draft) {
        const draftObj = draft.toObject();
        draft.images = { ...draftObj.images, ...draftImages };
        draft.specs = { ...draftObj.specs, ...mergedSpecs };
        draft.step = mergedSpecs.name ? 'specs_extracted' : 'image_enhanced';
        if (title || mergedSpecs.name) draft.title = title || mergedSpecs.name!;
        await draft.save();
      }
    }

    if (!draft) {
      draft = await Draft.create({
        artisanId,
        title: title || mergedSpecs.name || 'Studio Draft',
        images: draftImages,
        specs: mergedSpecs,
        step: mergedSpecs.name ? 'specs_extracted' : 'image_enhanced',
        aiMetadata: {
          studioOperation: 'process-complete',
          rawAiSpecs: extractedSpecs,
          aiConfidenceScore: extractedSpecs.confidence || 0.9,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'AI Product Studio images generated and draft saved successfully',
      data: {
        draft,
        images: draftImages,
      },
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('AI Studio draft error:', error);
    res.status(500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'AI Studio processing and draft storage failed',
    });
  }
};

/**
 * Attach voice specs to an existing draft
 * Transcribes audio via IndicConformer, extracts specs via Qwen, and merges into draft
 */
export const attachVoiceSpecsToDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Audio file is required' });
      return;
    }

    const draft = await Draft.findOne({ _id: draftId, artisanId: req.userId });
    if (!draft) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(404).json({ success: false, message: 'Draft not found' });
      return;
    }

    // Step 1: Transcribe voice
    const form = new FormData();
    form.append('audio', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const transcribeRes = await axios.post(`${AI_BASE}/ai/voice/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const transcript = transcribeRes.data?.text || transcribeRes.data?.data?.text || '';
    const detectedLang = transcribeRes.data?.language || transcribeRes.data?.data?.language || 'hi';

    // Step 2: Extract specs with Qwen
    const extractRes = await axios.post(`${AI_BASE}/ai/voice/extract-product`, {
      text: transcript,
      language: detectedLang,
    }, { timeout: 45000 });

    const extracted = extractRes.data?.data || {};

    // Step 3: Merge specs into draft
    const draftObj = draft.toObject();
    const currentSpecs = draftObj.specs || {};
    draft.specs = {
      ...currentSpecs,
      name: currentSpecs.name || extracted.name,
      nameHindi: currentSpecs.nameHindi || extracted.name_hi,
      description: currentSpecs.description || extracted.description_en || transcript,
      descriptionHindi: currentSpecs.descriptionHindi || extracted.description_hi,
      category: currentSpecs.category || extracted.category || 'crafts',
      materials: (currentSpecs.materials && currentSpecs.materials.length > 0) ? currentSpecs.materials : (extracted.materials || []),
      craftTechnique: currentSpecs.craftTechnique || extracted.craft_technique,
      colors: (currentSpecs.colors && currentSpecs.colors.length > 0) ? currentSpecs.colors : (extracted.colors || []),
      dimensions: currentSpecs.dimensions || extracted.dimensions,
      price: currentSpecs.price || extracted.price,
      suggestedPrice: currentSpecs.suggestedPrice || extracted.suggestedPrice,
      tags: (currentSpecs.tags && currentSpecs.tags.length > 0) ? currentSpecs.tags : (extracted.tags || []),
      careInstructions: (currentSpecs.careInstructions && currentSpecs.careInstructions.length > 0) ? currentSpecs.careInstructions : (extracted.care_instructions || []),
    };

    if (!draft.title || draft.title === 'Untitled Draft' || draft.title === 'Studio Draft') {
      if (draft.specs.name) draft.title = draft.specs.name;
    }

    draft.aiMetadata = {
      ...draftObj.aiMetadata,
      voiceTranscript: transcript,
      detectedLanguage: detectedLang,
      rawAiSpecs: extracted,
      aiConfidenceScore: extracted.confidence || 0.9,
    };

    draft.step = 'specs_extracted';
    if (draft.specs.name && draft.specs.price && (draft.images.ecommerceReady || draft.images.original)) {
      draft.status = 'ready_to_publish';
    }

    await draft.save();

    res.json({
      success: true,
      message: 'Voice transcribed and product specs attached to draft successfully',
      data: {
        draft,
        transcript,
        extractedSpecs: extracted,
      },
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Attach voice specs error:', error);
    res.status(500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to attach voice specs to draft',
    });
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
