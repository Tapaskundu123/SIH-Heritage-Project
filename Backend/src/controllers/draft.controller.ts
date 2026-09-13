import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Draft, { IDraftImages, IDraftSpecs } from '../models/Draft';
import Product, { IProductImage } from '../models/Product';
import Inventory from '../models/Inventory';
import { saveBase64Image, deleteFile } from '../utils/storage.util';

/**
 * Helper to process and persist base64 images from draft payload
 */
const processDraftImages = async (
  inputImages?: Partial<IDraftImages> & { base64?: Record<string, string> }
): Promise<Partial<IDraftImages>> => {
  if (!inputImages) return {};

  const images: Partial<IDraftImages> = { ...inputImages };

  // If base64 payload provided for studio outputs
  if (inputImages.base64) {
    if (inputImages.base64.original) {
      images.original = await saveBase64Image(inputImages.base64.original, 'orig');
    }
    if (inputImages.base64.noBackground) {
      images.noBackground = await saveBase64Image(inputImages.base64.noBackground, 'nobg');
    }
    if (inputImages.base64.enhanced) {
      images.enhanced = await saveBase64Image(inputImages.base64.enhanced, 'enh');
    }
    if (inputImages.base64.ecommerceReady) {
      images.ecommerceReady = await saveBase64Image(inputImages.base64.ecommerceReady, 'ecom');
    }
  }

  return images;
};

/**
 * Create or save a draft
 */
export const saveDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { draftId, title, images: rawImages, specs, aiMetadata, selectedPrimary } = req.body;
    const artisanId = req.userId;

    const processedImages = await processDraftImages(rawImages);
    if (selectedPrimary) {
      processedImages.selectedPrimary = selectedPrimary;
    }

    let draft;
    if (draftId) {
      draft = await Draft.findOne({ _id: draftId, artisanId });
      if (!draft) {
        res.status(404).json({ success: false, message: 'Draft not found' });
        return;
      }

      const draftObj = draft.toObject();
      if (title) draft.title = title;
      if (Object.keys(processedImages).length > 0) {
        draft.images = { ...draftObj.images, ...processedImages };
      }
      if (specs) {
        draft.specs = { ...draftObj.specs, ...specs };
        if (!title && specs.name) {
          draft.title = specs.name;
        }
      }
      if (aiMetadata) {
        draft.aiMetadata = { ...draftObj.aiMetadata, ...aiMetadata };
      }

      // Update step
      if (draft.images.ecommerceReady || draft.images.enhanced) {
        draft.step = draft.specs.name ? 'specs_extracted' : 'image_enhanced';
      }
      if (draft.specs.name && draft.specs.price && (draft.images.ecommerceReady || draft.images.original)) {
        draft.status = 'ready_to_publish';
      }

      await draft.save();
    } else {
      const draftTitle = title || (specs && specs.name) || 'Untitled Draft';
      const step = (processedImages.enhanced || processedImages.ecommerceReady)
        ? (specs?.name ? 'specs_extracted' : 'image_enhanced')
        : 'image_uploaded';

      draft = await Draft.create({
        artisanId,
        title: draftTitle,
        images: processedImages,
        specs: specs || {},
        aiMetadata: aiMetadata || {},
        step,
        status: (specs?.name && specs?.price && (processedImages.ecommerceReady || processedImages.original))
          ? 'ready_to_publish'
          : 'draft',
      });
    }

    res.status(200).json({
      success: true,
      message: draftId ? 'Draft updated successfully' : 'Draft created successfully',
      data: draft,
    });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
};

/**
 * Get all drafts for the logged-in artisan
 */
export const getMyDrafts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: Record<string, unknown> = { artisanId: req.userId };
    if (status) query.status = status;

    const [drafts, total] = await Promise.all([
      Draft.find(query).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)),
      Draft.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: drafts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Fetch drafts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drafts' });
  }
};

/**
 * Get a specific draft by ID
 */
export const getDraftById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const draft = await Draft.findOne({ _id: req.params.id, artisanId: req.userId });
    if (!draft) {
      res.status(404).json({ success: false, message: 'Draft not found' });
      return;
    }
    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch draft' });
  }
};

/**
 * Update draft specs (e.g. from voice extraction or manual editing)
 */
export const updateDraftSpecs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { specs, aiMetadata } = req.body;
    const draft = await Draft.findOne({ _id: req.params.id, artisanId: req.userId });

    if (!draft) {
      res.status(404).json({ success: false, message: 'Draft not found' });
      return;
    }

    const draftObj = draft.toObject();
    if (specs) {
      draft.specs = { ...draftObj.specs, ...specs };
      if (specs.name) draft.title = specs.name;
    }
    if (aiMetadata) {
      draft.aiMetadata = { ...draftObj.aiMetadata, ...aiMetadata };
    }

    draft.step = 'specs_extracted';
    if (draft.specs.name && draft.specs.price && (draft.images.ecommerceReady || draft.images.original)) {
      draft.status = 'ready_to_publish';
    }

    await draft.save();

    res.json({
      success: true,
      message: 'Draft specs updated successfully',
      data: draft,
    });
  } catch (error) {
    console.error('Update draft specs error:', error);
    res.status(500).json({ success: false, message: 'Failed to update draft specs' });
  }
};

/**
 * Delete draft and clean up disk files
 */
export const deleteDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const draft = await Draft.findOneAndDelete({ _id: req.params.id, artisanId: req.userId });
    if (!draft) {
      res.status(404).json({ success: false, message: 'Draft not found' });
      return;
    }

    // Clean up stored image files
    if (draft.images) {
      const filesToDelete = [
        draft.images.original,
        draft.images.noBackground,
        draft.images.enhanced,
        draft.images.ecommerceReady,
        ...(draft.images.gallery || []),
      ].filter(Boolean) as string[];

      await Promise.all(filesToDelete.map(url => deleteFile(url)));
    }

    res.json({ success: true, message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete draft' });
  }
};

/**
 * Publish a draft into an active marketplace Product
 */
export const publishDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const draft = await Draft.findOne({ _id: req.params.id, artisanId: req.userId });
    if (!draft) {
      res.status(404).json({ success: false, message: 'Draft not found' });
      return;
    }

    const { specs, images, aiMetadata } = draft;

    // Validate required fields for published product
    if (!specs.name) {
      res.status(400).json({ success: false, message: 'Product name is required to publish' });
      return;
    }
    if (!specs.price || specs.price <= 0) {
      res.status(400).json({ success: false, message: 'Valid price is required to publish' });
      return;
    }
    const category = specs.category || 'other';

    // Construct product images
    const productImages: IProductImage[] = [];

    // Prioritize ecommerce ready or enhanced as primary
    if (images.ecommerceReady) {
      productImages.push({ url: images.ecommerceReady, isOriginal: false, isEnhanced: true, isBgRemoved: true });
    }
    if (images.enhanced && images.enhanced !== images.ecommerceReady) {
      productImages.push({ url: images.enhanced, isOriginal: false, isEnhanced: true, isBgRemoved: false });
    }
    if (images.noBackground && images.noBackground !== images.ecommerceReady) {
      productImages.push({ url: images.noBackground, isOriginal: false, isEnhanced: false, isBgRemoved: true });
    }
    if (images.original) {
      productImages.push({ url: images.original, isOriginal: true, isEnhanced: false, isBgRemoved: false });
    }
    if (images.gallery && images.gallery.length > 0) {
      images.gallery.forEach(url => {
        productImages.push({ url, isOriginal: false, isEnhanced: false, isBgRemoved: false });
      });
    }

    if (productImages.length === 0) {
      res.status(400).json({ success: false, message: 'At least one product image is required to publish' });
      return;
    }

    const description = specs.description || `${specs.name} handcrafted by skilled artisans.`;

    // Create the Product
    const product = await Product.create({
      artisanId: req.userId,
      name: specs.name,
      nameHindi: specs.nameHindi,
      nameRegional: specs.nameRegional,
      description,
      descriptionHindi: specs.descriptionHindi,
      descriptionRegional: specs.descriptionRegional,
      category,
      subCategory: specs.subCategory,
      images: productImages,
      tags: specs.tags || [],
      materials: specs.materials || [],
      price: specs.price,
      suggestedPrice: specs.suggestedPrice,
      priceBreakdown: specs.priceBreakdown,
      unit: specs.unit || 'piece',
      stock: specs.stock || 1,
      craftTechnique: specs.craftTechnique,
      region: specs.region,
      isAIGenerated: Boolean(aiMetadata?.rawAiSpecs),
      aiConfidenceScore: aiMetadata?.aiConfidenceScore,
      voiceTranscript: aiMetadata?.voiceTranscript,
      detectedLanguage: aiMetadata?.detectedLanguage,
      isPublished: true,
    });

    // Initialize inventory record
    await Inventory.create({
      productId: product._id,
      artisanId: req.userId,
      currentStock: product.stock,
      lowStockThreshold: 5,
    });

    // Update draft status
    draft.status = 'published';
    draft.step = 'completed';
    draft.publishedProductId = product._id;
    await draft.save();

    res.status(201).json({
      success: true,
      message: 'Product published successfully to marketplace',
      data: {
        product,
        draft,
      },
    });
  } catch (error) {
    console.error('Publish draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to publish draft' });
  }
};
