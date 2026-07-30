import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, Sparkles, Layers, ShoppingBag, CheckSquare, Search, AlertCircle, Save, X, ImagePlus, Loader2, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { writeStore } from '../utils/storage';
import { uploadMedia } from '../lib/storageUpload';

export interface ProductGrade {
  code: string; // TG1, TG2, TG3
  name: string; // e.g. "Semi-Private Colosseo"
  capacity: number; // e.g. 7, 24
}

export interface Product {
  code: string; // 5524558P4
  name: string; // Private Colosseo
  label: string; // Private Colosseum Tour
  defaultCap: number; // 7
  grades: ProductGrade[];
  image?: string; // public URL in the sole-media bucket
}

// Storage key + defaults are the single source of truth for the product catalog.
// Consumers (booking form, schedule board) read these instead of hardcoding lists.
export const PRODUCTS_STORAGE_KEY = 'sole_custom_products';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    code: '5524558P4',
    name: 'Private Colosseo',
    label: 'Private Colosseum Tour',
    defaultCap: 7,
    grades: [
      { code: 'TG1', name: 'Private Luxury', capacity: 7 },
      { code: 'TG2', name: 'Couple Tour', capacity: 2 }
    ]
  },
  {
    code: '5524558P1',
    name: 'Colosseo guide',
    label: 'Group Colosseum Tour',
    defaultCap: 24,
    grades: [
      { code: 'TG1', name: 'Standard Group', capacity: 24 },
      { code: 'TG2', name: 'Semi-Private Group', capacity: 7 }
    ]
  },
  {
    code: '5524558P19',
    name: 'Walking Highlights',
    label: 'Walking Tour',
    defaultCap: 7,
    grades: [
      { code: 'TG1', name: 'Highlights Walk', capacity: 7 }
    ]
  },
  {
    code: '5524558P2',
    name: 'Golf Cart Rome',
    label: 'Golf Cart Tour',
    defaultCap: 7,
    grades: [
      { code: 'TG1', name: 'Golf Cart Group', capacity: 7 }
    ]
  },
  {
    code: '5524558P10',
    name: 'Famagusta Tour',
    label: 'Private Cyprus Tour',
    defaultCap: 7,
    grades: [
      { code: 'TG1', name: 'Private Cyprus Tour', capacity: 7 }
    ]
  },
  {
    code: '5524558P18',
    name: 'Rome Photo Shoot',
    label: 'Professional Photo Shoot',
    defaultCap: 5,
    grades: [
      { code: 'TG1', name: 'Standard Shoot', capacity: 5 }
    ]
  },
  {
    code: '5524558P3',
    name: 'Vatican Museum',
    label: 'Vatican Tour',
    defaultCap: 24,
    grades: [
      { code: 'TG1', name: 'Vatican Group', capacity: 24 },
      { code: 'TG2', name: 'Vatican Semi-Private', capacity: 7 }
    ]
  }
];

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Forms State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdLabel, setNewProdLabel] = useState('');
  const [newProdCap, setNewProdCap] = useState(7);
  
  // Tour grade management under selected product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newGradeCode, setNewGradeCode] = useState('TG1');
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeCap, setNewGradeCap] = useState(7);

  // Custom Confirmation state
  const [deleteProductConfirmCode, setDeleteProductConfirmCode] = useState<string | null>(null);
  const [deleteGradeConfirmCode, setDeleteGradeConfirmCode] = useState<string | null>(null);

  // Catalog image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (stored) {
      try {
        setProducts(JSON.parse(stored));
      } catch (e) {
        setProducts(DEFAULT_PRODUCTS);
      }
    } else {
      setProducts(DEFAULT_PRODUCTS);
      writeStore(PRODUCTS_STORAGE_KEY, DEFAULT_PRODUCTS);
    }
  }, []);

  const saveProducts = (list: Product[]) => {
    setProducts(list);
    // writeStore broadcasts so the booking form / schedule board pick up changes live.
    writeStore(PRODUCTS_STORAGE_KEY, list);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdCode || !newProdName || !newProdLabel) {
      alert("Please fill all required fields.");
      return;
    }

    if (products.some(p => p.code === newProdCode)) {
      alert("A product with this code already exists!");
      return;
    }

    const newP: Product = {
      code: newProdCode,
      name: newProdName,
      label: newProdLabel,
      defaultCap: newProdCap,
      grades: [
        { code: 'TG1', name: 'Standard Grade', capacity: newProdCap }
      ]
    };

    const updated = [...products, newP];
    saveProducts(updated);

    // Reset Form
    setNewProdCode('');
    setNewProdName('');
    setNewProdLabel('');
    setNewProdCap(7);
    setShowAddProductModal(false);
  };

  // Upload (or replace) the catalog image of the selected product. Any picture
  // format the browser reports as an image is accepted — the bucket stores the
  // file as-is and we keep only the returned public URL on the product.
  const handleImageUpload = async (file: File | null) => {
    if (!file || !selectedProduct) return;
    if (!file.type.startsWith('image/')) {
      setImageError('That file is not a picture. Choose a JPG, PNG, WEBP, GIF, SVG, HEIC…');
      return;
    }
    setImageError(null);
    setUploadingImage(true);
    try {
      const url = await uploadMedia(file, 'products');
      const updatedProd = { ...selectedProduct, image: url };
      saveProducts(products.map(p => (p.code === selectedProduct.code ? updatedProd : p)));
      setSelectedProduct(updatedProd);
    } catch (e: any) {
      setImageError(e?.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (!selectedProduct) return;
    const updatedProd = { ...selectedProduct, image: '' };
    saveProducts(products.map(p => (p.code === selectedProduct.code ? updatedProd : p)));
    setSelectedProduct(updatedProd);
  };

  const executeDeleteProduct = (code: string) => {
    const updated = products.filter(p => p.code !== code);
    saveProducts(updated);
    if (selectedProduct?.code === code) {
      setSelectedProduct(null);
    }
    setDeleteProductConfirmCode(null);
  };

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !newGradeCode || !newGradeName) return;

    if (selectedProduct.grades.some(g => g.code === newGradeCode)) {
      alert(`Tour grade ${newGradeCode} already exists under this product!`);
      return;
    }

    const newG: ProductGrade = {
      code: newGradeCode,
      name: newGradeName,
      capacity: newGradeCap
    };

    const updatedGrades = [...selectedProduct.grades, newG];
    const updatedProd = { ...selectedProduct, grades: updatedGrades };

    const nextProducts = products.map(p => p.code === selectedProduct.code ? updatedProd : p);
    saveProducts(nextProducts);
    setSelectedProduct(updatedProd);

    // Reset
    setNewGradeCode(`TG${updatedGrades.length + 1}`);
    setNewGradeName('');
    setNewGradeCap(7);
  };

  const executeDeleteGrade = (gradeCode: string) => {
    if (!selectedProduct) return;
    if (selectedProduct.grades.length <= 1) {
      alert("Each product must have at least one tour grade option!");
      return;
    }

    const updatedGrades = selectedProduct.grades.filter(g => g.code !== gradeCode);
    const updatedProd = { ...selectedProduct, grades: updatedGrades };

    const nextProducts = products.map(p => p.code === selectedProduct.code ? updatedProd : p);
    saveProducts(nextProducts);
    setSelectedProduct(updatedProd);
    setDeleteGradeConfirmCode(null);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Product Catalog Manager</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Define your luxury catalog, customize tour grade options (TG1-TG3), and set participant limits.</p>
        </div>
        <button
          onClick={() => setShowAddProductModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition shadow-lg shadow-orange-600/15 cursor-pointer hover:scale-105 active:scale-95 duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Catalog Item</span>
        </button>
      </div>

      {/* The app shell's <main> is the scroll container, so this grid flows at its
          natural height. Pinning it to the viewport and hiding the overflow (as it
          used to) sliced the last row of cards off at a hard edge — and because
          scrollbars are hidden globally there was nothing to show it could scroll. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns: Products catalog ledger */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search catalog by code or label..."
                className="w-full bg-white/80 border border-slate-200/90 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white shadow-sm"
              />
            </div>
          </div>

          {/* Catalog grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filteredProducts.map((p, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                key={p.code} 
                onClick={() => {
                  setSelectedProduct(p);
                  setNewGradeCode(`TG${p.grades.length + 1}`);
                }}
                className={`border rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                  selectedProduct?.code === p.code 
                    ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-500/20 shadow-md' 
                    : 'bg-white border-slate-200 shadow-md hover:shadow-lg'
                }`}
              >
                {/* Catalog cover image (or an empty-state placeholder) */}
                <div className={`relative w-full aspect-[5/2] rounded-xl overflow-hidden mb-4 border ${
                  selectedProduct?.code === p.code ? 'border-orange-200' : 'border-slate-100'
                } bg-slate-50`}>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.label}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-300">
                      <ImageOff className="w-6 h-6" />
                      <span className="text-[0.5625rem] font-bold uppercase tracking-wider">No image</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[0.625rem] font-bold text-orange-600 font-mono tracking-wider">{p.code}</span>
                    <h3 className="font-extrabold text-sm text-slate-800 leading-tight mt-0.5">{p.label}</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteProductConfirmCode(p.code);
                    }}
                    className="p-2 rounded bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 transition cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Alias Name:</span>
                  <span className="font-bold text-slate-700">{p.name}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Default Max Capacity:</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[0.625rem] font-bold text-slate-700 font-mono">
                    {p.defaultCap} Pax
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {p.grades.map(g => (
                    <span key={g.code} className="px-2 py-0.5 bg-orange-50 border border-orange-100 text-orange-600 font-bold text-[0.5625rem] rounded-lg">
                      {g.code}: {g.capacity} pax
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Columns: Selected product's sub-grades editor.
            Sticky on desktop so it stays in view while the catalog scrolls past,
            with its own scroll only if the grade list outgrows the viewport. */}
        <div className="lg:col-span-1 lg:sticky lg:top-2 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          {selectedProduct ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-md">
              <div>
                <span className="text-[0.625rem] font-bold text-orange-600 font-mono uppercase tracking-widest">Catalog Subgrade Config</span>
                <h3 className="text-base font-extrabold text-slate-900 font-sans mt-0.5">{selectedProduct.label} Options</h3>
              </div>

              {/* ─── Catalog image uploader (accepts any picture format) ─── */}
              <div className="space-y-3">
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Catalog Image</span>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  id="product-image-input"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                />

                {/* Same 5:2 ratio as the catalog card, so the crop previewed here
                    is exactly the crop the card will show. */}
                <div className="relative w-full aspect-[5/2] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.label} className="w-full h-full object-cover" />
                  ) : (
                    <label
                      htmlFor="product-image-input"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-orange-600 hover:bg-orange-50/40 transition"
                    >
                      <ImagePlus className="w-7 h-7" />
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider">Click to upload</span>
                      <span className="text-[0.5625rem] font-semibold text-slate-400">JPG · PNG · WEBP · GIF · SVG · HEIC</span>
                    </label>
                  )}

                  {uploadingImage && (
                    <div className="absolute inset-0 bg-white/75 backdrop-blur-[0.0625rem] flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                      <span className="text-[0.625rem] font-bold text-slate-600 uppercase tracking-wider">Uploading…</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <label
                    htmlFor="product-image-input"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer active:scale-95"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {selectedProduct.image ? 'Replace Image' : 'Upload Image'}
                  </label>
                  {selectedProduct.image && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      title="Remove image"
                      className="px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {imageError && (
                  <div className="flex items-start gap-1.5 text-[0.625rem] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>{imageError}</span>
                  </div>
                )}
              </div>

              {/* Sub-grades ledger */}
              <div className="space-y-3">
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Defined Tour Grades</span>
                {selectedProduct.grades.map(g => (
                  <div key={g.code} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-orange-50 border border-orange-100 text-orange-600 font-mono font-black text-[0.5625rem] rounded">
                          {g.code}
                        </span>
                        <strong className="text-xs text-slate-800">{g.name}</strong>
                      </div>
                      <span className="text-[0.625rem] text-slate-500 font-semibold mt-1 block">Capacity Limit: {g.capacity} Pax</span>
                    </div>

                    <button
                      onClick={() => setDeleteGradeConfirmCode(g.code)}
                      className="p-1.5 rounded bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 transition cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Sub-grade Option Form */}
              <form onSubmit={handleAddGrade} className="space-y-4 pt-4 border-t border-slate-100">
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Create New Option Grade</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.5625rem] font-bold text-slate-500 uppercase">Option Code</label>
                    <input
                      type="text"
                      required
                      value={newGradeCode}
                      onChange={e => setNewGradeCode(e.target.value.toUpperCase())}
                      className="bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[0.5625rem] font-bold text-slate-500 uppercase">Option Name</label>
                    <input
                      type="text"
                      required
                      value={newGradeName}
                      onChange={e => setNewGradeName(e.target.value)}
                      placeholder="e.g. Couples Special"
                      className="bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[0.5625rem] font-bold text-slate-500 uppercase">Participant Limit (Capacity)</label>
                  <input
                    type="number"
                    min={1}
                    value={newGradeCap}
                    onChange={e => setNewGradeCap(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer active:scale-95"
                >
                  Save Option
                </button>
              </form>
            </motion.div>
          ) : (
            <div className="h-[15.625rem] flex flex-col gap-2 items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-center p-6 bg-white/20">
              <Layers className="w-8 h-8 text-slate-300 animate-pulse" />
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Click on any product in the catalog to manage its sub-grade options (TG1, TG2, etc.).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add Product Catalog Item Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {showAddProductModal && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[0.125rem] flex items-center justify-center z-[9999] p-4"
              onClick={() => setShowAddProductModal(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowAddProductModal(false)}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">Create Catalog Product</h3>
                <p className="text-slate-450 text-xs font-semibold mb-5">Add a new tour option, set pricing parameters, and configure default passenger limits.</p>

                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">Product Code (Unique)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5524558P20"
                      value={newProdCode}
                      onChange={e => setNewProdCode(e.target.value.trim())}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">Product Label Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Colosseum Night Walk"
                      value={newProdLabel}
                      onChange={e => setNewProdLabel(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">Short Alias</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Night Colosseum"
                        value={newProdName}
                        onChange={e => setNewProdName(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">Default Max Cap</label>
                      <input
                        type="number"
                        min={1}
                        value={newProdCap}
                        onChange={e => setNewProdCap(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddProductModal(false)}
                      className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer active:scale-95 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-700 shadow-md cursor-pointer active:scale-95 transition"
                    >
                      Save Product
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Custom Confirm Delete Product Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteProductConfirmCode && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[0.125rem] flex items-center justify-center z-[9999] p-4"
              onClick={() => setDeleteProductConfirmCode(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Catalog Product</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to delete product <span className="font-mono text-orange-600 font-extrabold">{deleteProductConfirmCode}</span>? This catalog item and its grades will be deleted.
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteProductConfirmCode(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteProduct(deleteProductConfirmCode)}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Custom Confirm Delete Grade Option Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteGradeConfirmCode && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[0.125rem] flex items-center justify-center z-[9999] p-4"
              onClick={() => setDeleteGradeConfirmCode(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Option Grade</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to delete option grade <span className="font-mono text-orange-600 font-extrabold">{deleteGradeConfirmCode}</span> under this product?
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteGradeConfirmCode(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteGrade(deleteGradeConfirmCode)}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
