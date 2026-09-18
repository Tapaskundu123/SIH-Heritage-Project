import { Router } from 'express';
import multer from 'multer';
import {
  transcribeVoice,
  extractProductInfo,
  removeBackground,
  enhanceImage,
  generateCatalog,
  aiHealth,
  processStudioAndSaveDraft,
  attachVoiceSpecsToDraft,
} from '../controllers/ai.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

const upload = multer({ dest: 'uploads/temp/', limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.get('/health', aiHealth);
router.post('/voice/transcribe', optionalAuthenticate, upload.single('audio'), transcribeVoice);
router.post('/voice/extract-product', authenticate, extractProductInfo);
router.post('/image/remove-bg', authenticate, upload.single('image'), removeBackground);
router.post('/image/enhance', authenticate, upload.single('image'), enhanceImage);
router.post('/catalog/generate', authenticate, generateCatalog);

// AI Studio + Draft Storage & Product Specs Integration
router.post('/image/studio-save-draft', authenticate, upload.single('image'), processStudioAndSaveDraft);
router.post('/draft/:draftId/attach-voice-specs', authenticate, upload.single('audio'), attachVoiceSpecsToDraft);

export default router;
