import { asyncHandler } from '../../utils/asyncHandler.js';
import multer from 'multer';
import xlsx from 'xlsx';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';
import * as productService from './product.service.js';


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowed.includes(file.mimetype) ||
        file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  },
});

export const bulkRemove = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length)
    throw new AppError('No IDs provided', 400);
  const result = await productService.bulkDeleteProducts(ids);
  sendSuccess(res, result, `${result.deleted} products deleted`);
});

export const getAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await productService.getAllProducts(req.query);
  sendPaginated(res, data, pagination);
});

export const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  sendSuccess(res, product);
});

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  sendCreated(res, product, 'Product created');
});

export const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  sendSuccess(res, product, 'Product updated');
});

export const remove = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  sendSuccess(res, null, 'Product deleted');
});

export const patchStock = asyncHandler(async (req, res) => {
  const { qty, operation } = req.body;
  const product = await productService.updateStock(req.params.id, qty, operation);
  sendSuccess(res, product, 'Stock updated');
});

export const uploadMiddleware = upload.single('file');


export const bulkUpload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];

  // raw:false keeps values as formatted strings; defval ensures no undefined
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) throw new AppError('File is empty or unreadable', 400);

  // Normalize any key: lowercase + remove all non-alphanumeric
  const n = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

  // Find actual row key that fuzzy-matches any of the target words
  const pick = (row, ...targets) => {
    const entry = Object.entries(row).find(([k]) =>
      targets.some(t => n(k) === n(t) || n(k).includes(n(t)))
    );
    return entry ? entry[1] : '';
  };

  const validUnits = ['Nos','Kg','Mtr','Box','Pcs','Roll','Ltr','Set'];
  const unitMap    = {
    pcs:'Pcs', nos:'Nos', kg:'Kg', mtr:'Mtr',
    box:'Box', roll:'Roll', ltr:'Ltr', set:'Set', m:'Mtr',
  };

const preview = rows.map((row, idx) => {
  const name    = String(pick(row, 'particulars','name','product','item','description')).trim().toUpperCase();
  const rawUnit = String(pick(row, 'per','unit','uom')).trim();
  const qty     = parseFloat(pick(row, 'qty','quantity','stock','opening')) || 0;
  const amount  = parseFloat(pick(row, 'amount','total','value'))           || 0;

  const rateRaw = pick(row, 'rate','price','unitprice','unitrate');
  const rate    = rateRaw !== ''
    ? parseFloat(rateRaw)
    : (qty > 0 ? +(amount / qty).toFixed(2) : 0);

  const discPercent      = parseFloat(pick(row, 'disc','discpercent','discount')) || 0;
  const totalAmount      = parseFloat(pick(row, 'totalamount','total'))           || 0;
  const gstPercentRaw    = parseFloat(pick(row, 'gst','gstpercent'));
  const gstPercent       = isNaN(gstPercentRaw) ? 18 : gstPercentRaw;
  const taxableAmount = parseFloat(pick(row, 'taxableamount', 'taxableamountgst', 'taxable')) || 0;
  const sellingAmountAll = parseFloat(pick(row, 'sellingamountall','sellingamount(all)')) || 0;
  const sellingRateRaw   = pick(row, 'sellingamountperpcs','sellingamount(perpcs)','sellingrate');
  const sellingRate      = sellingRateRaw !== ''
    ? parseFloat(sellingRateRaw)
    : (qty > 0 && sellingAmountAll > 0 ? +(sellingAmountAll / qty).toFixed(2) : 0);

  return {
    _row:       idx + 2,
    name,
    unit:       unitMap[rawUnit.toLowerCase()] || (validUnits.includes(rawUnit) ? rawUnit : 'Nos'),
    rate:       isNaN(rate) ? 0 : rate,
    discPercent,
    totalAmount,
    gstPercent,
    isGstApplicable: gstPercent > 0,
    taxableAmount,
    sellingAmountAll,
    sellingRate:     isNaN(sellingRate) ? 0 : sellingRate,
    stock:      isNaN(qty)  ? 0 : Math.round(qty),
  };
}).filter(r => r.name && r.rate > 0);

  if (!preview.length) {
    // Help diagnose: tell client what headers were actually detected
    const detectedHeaders = Object.keys(rows[0] || {}).join(', ');
    throw new AppError(
      `No valid rows parsed. Headers found: [${detectedHeaders}]. ` +
      `Ensure columns include: Particulars, Rate or Amount, Qty.`,
      400
    );
  }

  sendSuccess(res, { preview }, `${preview.length} rows ready for review`);
});

export const confirmBulkUpload = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || !rows.length)
    throw new AppError('No rows to import', 400);

  const results = await productService.bulkCreateProducts(rows);
  sendSuccess(res, results,
    `Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`
  );
});