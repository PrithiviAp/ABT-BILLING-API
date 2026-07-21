import { AppError } from '../../utils/appError.js';
import Product from './product.model.js';
import { computeProductAmounts, computeTaxableAmount } from '../../utils/product.util.js';


const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const bulkDeleteProducts = async (ids) => {
  const result = await Product.updateMany(
    { _id: { $in: ids } },
    { isActive: false }
  );
  if (!result.modifiedCount) throw new AppError('No products found', 404);
  return { deleted: result.modifiedCount };
};

export const createProduct = async (data) => {
  const name = String(data.name || '').trim().toUpperCase();
  const isGstApplicable = data.isGstApplicable ?? true;

  const computed = computeProductAmounts({
    rate:             data.rate,
    stock:            data.stock,
    discPercent:      data.discPercent ?? 0,
    isGstApplicable,
    gstPercent:       data.gstPercent,
    sellingRate:      data.sellingRate,
  });

  const existing = await Product.findOne({
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
  });

  if (existing) {
    Object.assign(existing, {
      unit:         data.unit,
      rate:         data.rate,
      stock:        data.stock,
      openingStock: data.stock,   // ← reset baseline to match new stock entry
      isActive:     true,
      isGstApplicable,
      ...computed,
    });
    await existing.save();
    return existing;
  }

  return Product.create({
    ...data,
    name,
    isGstApplicable,
    openingStock: data.stock || 0,   // ← this line was missing entirely
    ...computed,
  });
};
export const updateProduct = async (id, data) => {
  if (data.name) {
    const name = String(data.name).trim().toUpperCase();
    const clash = await Product.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
      _id:  { $ne: id },
    });
    if (clash) throw new AppError(`Product "${name}" already exists`, 409);
    data = { ...data, name };
  }

// updateProduct — also add discPercent to the recompute trigger list
const shouldRecompute = ['rate', 'stock', 'isGstApplicable', 'gstPercent', 'sellingRate', 'discPercent']
  .some(f => data[f] !== undefined);

if (shouldRecompute) {
  const current = await Product.findById(id);
  if (!current) throw new AppError('Product not found', 404);

  const isGstApplicable = data.isGstApplicable ?? current.isGstApplicable;

  const computed = computeProductAmounts({
    rate:             data.rate             ?? current.rate,
    stock:            data.stock             ?? current.stock,
    discPercent:      data.discPercent       ?? current.discPercent,
    isGstApplicable,
    gstPercent:       data.gstPercent        ?? current.gstPercent,
    sellingRate:      data.sellingRate       ?? current.sellingRate,
  });

  data = { ...data, isGstApplicable, ...computed };
}

  const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const bulkCreateProducts = async (rows) => {
  const results = { created: 0, updated: 0, skipped: 0, errors: [] };

  const docs = rows
    .map(({ _row, ...data }) => {
      const isGstApplicable = data.isGstApplicable ?? (parseFloat(data.gstPercent) > 0);
      const rate  = parseFloat(data.rate) || 0;
      const stock = Math.round(parseFloat(data.stock) || 0);

      const computed = computeProductAmounts({
        rate,
        stock,
        discPercent:      parseFloat(data.discPercent) || 0,
        isGstApplicable,
        gstPercent:       parseFloat(data.gstPercent) || 18,
        sellingRate:      parseFloat(data.sellingRate) || 0,
      });

      return {
        name: String(data.name || '').trim().toUpperCase(),
        unit: data.unit || 'Nos',
        rate,
        stock,
        isGstApplicable,
        isActive: true,
        ...computed,
      };
    })
    .filter(d => d.name && d.rate > 0);

  if (!docs.length) return results;

const bulkOps = docs.map(doc => {
  const { stock, ...rest } = doc;
  return {
    updateOne: {
      filter: { name: { $regex: `^${escapeRegex(doc.name)}$`, $options: 'i' } },
      update: {
        $set: { ...rest, stock },
        $setOnInsert: { openingStock: stock },   // ← only set on first insert, never overwritten after
      },
      upsert: true,
    },
  };
});

  try {
    const res = await Product.bulkWrite(bulkOps, { ordered: false });
    results.created = res.upsertedCount ?? 0;
    results.updated = res.modifiedCount ?? 0;
  } catch (err) {
    results.created = err.result?.upsertedCount ?? 0;
    results.updated = err.result?.modifiedCount ?? 0;
    (err.writeErrors || []).forEach(e => {
      results.errors.push({ name: e.err?.op?.q?.name ?? '?', reason: e.errmsg || 'Update failed' });
      results.skipped++;
    });
  }

  return results;
};

// ── unchanged below ───────────────────────────────────────────
export const getAllProducts = async ({ search, page = 1, limit = 10, active = 'true' }) => {
  const query = { isActive: active !== 'false' };

  if (search) {
    query.$or = [{ name: { $regex: search, $options: 'i' } }];
  }

  const p     = Math.max(1, parseInt(page));
  const l     = Math.max(1, parseInt(limit));
  const skip  = (p - 1) * l;
  console.log('paru query', query);
  const total = await Product.countDocuments(query);
  const data  = await Product.find(query).sort({ name: 1 }).skip(skip).limit(l);

  return { data, pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) } };
};

export const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const updateStock = async (id, qty, operation = 'set') => {
  const ops = {
    set:       { $set: { stock: qty } },
    increment: { $inc: { stock: qty, openingStock: qty } },   // restock raises the baseline too
    decrement: { $inc: { stock: -qty } },
  };
  const product = await Product.findByIdAndUpdate(id, ops[operation], { new: true });
  if (!product) throw new AppError('Product not found', 404);
  return product;
};