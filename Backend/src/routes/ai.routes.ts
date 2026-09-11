import { Router } from 'express';
import multer from 'multer';
import {
  transcribeVoice, extractProductInfo,
  removeBackground, enhanceImage, generateCatalog, aiHealth,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const upload = multer({ dest: 'uploads/temp/', limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.get('/health', aiHealth);
router.post('/voice/transcribe', authenticate, upload.single('audio'), transcribeVoice);
router.post('/voice/extract-product', authenticate, extractProductInfo);
router.post('/image/remove-bg', authenticate, upload.single('image'), removeBackground);
router.post('/image/enhance', authenticate, upload.single('image'), enhanceImage);
router.post('/catalog/generate', authenticate, generateCatalog);

export default router;
