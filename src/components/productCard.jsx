import React from 'react';

export default function ProductCard({ product, onSelect }) {
  return (
    <div className="group bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
      <div>
        <div className="relative aspect-square overflow-hidden bg-slate-950">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          />
          <span className="absolute top-3 right-3 bg-indigo-950/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-full font-medium">
            {product.tag}
          </span>
        </div>

        <div className="p-5">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            {product.category}
          </p>
          <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
          <p className="text-slate-400 text-sm line-clamp-2 mb-3">
            {product.description}
          </p>

          {/* Render included items list if it's a bundle */}
          {product.isBundle && (
            <div className="mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wide">
                Includes:
              </span>
              <div className="flex flex-wrap gap-1">
                {product.items.map((item) => (
                  <span
                    key={item}
                    className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-500/20 px-2 py-0.5 rounded"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {product.availableSizes.map((size) => (
              <span
                key={size}
                className="text-[11px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded"
              >
                {size}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-2">
        <div>
          <span className="text-xs text-slate-500 block">Price</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-black text-white">₱{product.price}</span>
            {product.originalPrice && (
              <span className="text-xs text-slate-500 line-through">
                ₱{product.originalPrice}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onSelect(product)}
          className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg transition-colors border border-slate-700 hover:border-indigo-500"
        >
          {product.isBundle ? 'Get Bundle' : 'Buy Item'}
        </button>
      </div>
    </div>
  );
}