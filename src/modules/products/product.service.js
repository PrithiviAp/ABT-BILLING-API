import { AppError } from '../../utils/appError.js';
import Product from './product.model.js';

export const getAllProducts = async ({ search, page = 1, limit = 50, active = true }) => {
  const query = { isActive: active };

  if (search) {
    query.$or = [
      { name:    { $regex: search, $options: 'i' } },
      { hsnCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await Product.countDocuments(query);
  const data  = await Product.find(query).sort({ name: 1 }).skip(skip).limit(+limit);

  return { data, pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) } };
};

export const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const createProduct = async (data) => {
  const existing = await Product.findOne({ name: { $regex: `^${data.name}$`, $options: 'i' } });
  if (existing) throw new AppError('Product with this name already exists', 409);
  return Product.create(data);
};

export const updateProduct = async (id, data) => {
  const product = await Product.findByIdAndUpdate(id, data, {
    new: true, runValidators: true
  });
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findByIdAndUpdate(
    id, { isActive: false }, { new: true }
  );
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const updateStock = async (id, qty, operation = 'set') => {
  const ops = {
    set:       { stock: qty },
    increment: { $inc: { stock: qty } },
    decrement: { $inc: { stock: -qty } },
  };
  const update = operation === 'set' ? { $set: ops.set } : ops[operation];
  const product = await Product.findByIdAndUpdate(id, update, { new: true });
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const bulkCreateProducts = async (rows) => {
  const results = { created: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    // Strip internal _row field added during preview
    const { _row, ...data } = row;
    const name = String(data.name || '').trim().toUpperCase();

    try {
      if (!name || !data.hsnCode) {
        results.errors.push({ name: name || '?', reason: 'Missing name or HSN code' });
        results.skipped++;
        continue;
      }

      if (!data.rate || data.rate <= 0) {
        results.errors.push({ name, reason: 'Invalid rate' });
        results.skipped++;
        continue;
      }

      const existing = await Product.findOne({
        name: { $regex: `^${name}$`, $options: 'i' }
      });

      if (existing) {
        results.errors.push({ name, reason: 'Already exists' });
        results.skipped++;
        continue;
      }

      await Product.create({
        name,
        hsnCode:    String(data.hsnCode).trim(),
        unit:       data.unit       || 'Nos',
        rate:       parseFloat(data.rate),
        gstPercent: parseFloat(data.gstPercent) || 18,
        stock:      Math.round(parseFloat(data.stock) || 0),
        isActive:   true,
      });

      results.created++;
    } catch (err) {
      results.errors.push({ name, reason: err.message });
      results.skipped++;
    }
  }

  return results;
};
// export const bulkCreateProducts = async (rows) => {
//   const results = { created: 0, skipped: 0, errors: [] };

//   for (const row of rows) {
//     try {
//       const name = String(row['particulars'] || row['Particulars'] || '').trim().toUpperCase();
//       const hsnCode = String(row['hsn/sac'] || row['HSN/SAC'] || row['hsn'] || '').trim();
//       const stock = parseFloat(row['qty'] || row['Qty'] || 0);
//       const unit = String(row['per'] || row['Per'] || 'Nos').trim();
//       const amount = parseFloat(row['amount'] || row['Amount'] || 0);
//       const qty = parseFloat(row['qty'] || row['Qty'] || 1);

//       if (!name || !hsnCode) {
//         results.errors.push({ name, reason: 'Missing name or HSN code' });
//         results.skipped++;
//         continue;
//       }

//       // Selling price = final amount per piece
//       const rate = qty > 0 ? +(amount / qty).toFixed(2) : 0;

//       if (rate <= 0) {
//         results.errors.push({ name, reason: 'Invalid rate computed' });
//         results.skipped++;
//         continue;
//       }

//       // Normalize unit to allowed enum
//       const unitMap = {
//         pcs: 'Pcs', nos: 'Nos', kg: 'Kg',
//         mtr: 'Mtr', box: 'Box', roll: 'Roll',
//         ltr: 'Ltr', set: 'Set', m: 'Mtr',
//       };
//       const normalizedUnit = unitMap[unit.toLowerCase()] || 'Nos';

//       // Skip if already exists
//       const existing = await Product.findOne({
//         name: { $regex: `^${name}$`, $options: 'i' }
//       });

//       if (existing) {
//         results.skipped++;
//         results.errors.push({ name, reason: 'Already exists' });
//         continue;
//       }

//       await Product.create({
//         name,
//         hsnCode,
//         unit: normalizedUnit,
//         rate,
//         gstPercent: 18,   // default — can be updated later
//         stock: Math.round(stock),
//         isActive: true,
//       });

//       results.created++;
//     } catch (err) {
//       results.errors.push({ name: row['particulars'] || '?', reason: err.message });
//       results.skipped++;
//     }
//   }

//   return results;
// };