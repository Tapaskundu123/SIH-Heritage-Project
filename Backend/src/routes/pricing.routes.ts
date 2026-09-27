import { Router } from 'express';
import multer from 'multer';
import { suggestPrice, predictSiglip } from '../controllers/pricing.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

const upload = multer({ dest: 'uploads/temp/', limits: { fileSize: 30 * 1024 * 1024 } });
const router = Router();

router.post('/suggest', optionalAuthenticate, suggestPrice);
router.post('/predict-siglip', optionalAuthenticate, upload.single('image'), predictSiglip);

export default router;
