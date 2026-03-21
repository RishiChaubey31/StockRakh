'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function priceLabel(part) {
  if (part.mrp != null) return `Rs ${Number(part.mrp).toLocaleString('en-IN')}`;
  if (part.buyingPrice != null) return `Rs ${Number(part.buyingPrice).toLocaleString('en-IN')}`;
  return '—';
}

const scrollTrackClass =
  'flex h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory ' +
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ' +
  'touch-pan-x';

function CardMultiImageStrip({ images, partName, onImageClick }) {
  const scrollRef = useRef(null);
  const [slide, setSlide] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || images.length <= 1) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.min(images.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
    setSlide(prev => (prev === i ? prev : i));
  };

  const scrollBySlide = dir => {
    const el = scrollRef.current;
    if (!el || images.length <= 1) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  const goToSlide = idx => {
    const el = scrollRef.current;
    if (!el || images.length <= 1) return;
    const clamped = Math.min(images.length - 1, Math.max(0, idx));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="group relative h-full w-full" onClick={e => e.stopPropagation()}>
      <div ref={scrollRef} onScroll={handleScroll} className={scrollTrackClass}>
        {images.map((src, i) =>
          onImageClick ? (
            <button
              key={i}
              type="button"
              onClick={e => {
                e.stopPropagation();
                onImageClick(i);
              }}
              className="relative h-full min-w-full w-full shrink-0 snap-start border-0 bg-transparent p-0"
              style={{ cursor: 'pointer' }}
            >
              <img
                src={src}
                alt={`${partName} ${i + 1}`}
                className="pointer-events-none h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ) : (
            <div key={i} className="relative h-full min-w-full w-full shrink-0 snap-start">
              <img
                src={src}
                alt={`${partName} ${i + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ),
        )}
      </div>

      <button
        type="button"
        aria-label="Previous image"
        onClick={e => {
          e.stopPropagation();
          scrollBySlide(-1);
        }}
        className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Next image"
        onClick={e => {
          e.stopPropagation();
          scrollBySlide(1);
        }}
        className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex flex-col items-center gap-1.5">
        <span className="rounded-md bg-black/55 px-2 py-0.5 font-mono text-[10px] font-medium text-white">
          {slide + 1} / {images.length}
        </span>
        <div className="pointer-events-auto flex gap-1.5" onClick={e => e.stopPropagation()}>
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to image ${idx + 1}`}
              onClick={e => {
                e.stopPropagation();
                goToSlide(idx);
              }}
              className={`touch-manipulation rounded-full transition-all ${
                slide === idx ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/60 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductCard({
  part,
  onCardClick,
  onEdit,
  onDelete,
  onQuantityChange,
  onImageClick,
}) {
  const images = (part.partImages || []).filter(Boolean);

  const isLow = part.quantity > 0 && part.quantity <= 5;
  const isOut = part.quantity === 0;

  const statusColor = isOut ? '#e05a3a' : isLow ? '#d97706' : '#16a34a';
  const statusBg = isOut ? '#fff2ef' : isLow ? '#fffbeb' : '#f0fdf4';
  const statusBorder = isOut ? '#ffc4b4' : isLow ? '#fde68a' : '#bbf7d0';
  const statusLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

  const codeDisplay = part.code?.trim() || part.partNumber;

  return (
    <div
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={
        onCardClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick(e);
              }
            }
          : undefined
      }
      style={{
        background: '#ffffff',
        border: '1.5px solid #eaeaf4',
        borderRadius: 22,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 360,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s, box-shadow 0.3s',
        boxShadow: '0 2px 12px rgba(80,80,140,0.07)',
        position: 'relative',
        cursor: onCardClick ? 'pointer' : undefined,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 16px 44px rgba(80,80,140,0.14)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(80,80,140,0.07)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 4,
          background: statusBg,
          border: `1px solid ${statusBorder}`,
          borderRadius: 20,
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            color: statusColor,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div
        style={{
          height: 172,
          position: 'relative',
          background: '#f4f4f8',
        }}
      >
        {images.length === 0 ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b4b4c8',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            No image
          </div>
        ) : images.length === 1 ? (
          onImageClick ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onImageClick?.(0);
              }}
              style={{
                width: '100%',
                height: '100%',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <img
                src={images[0]}
                alt={part.partName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ) : (
            <img
              src={images[0]}
              alt={part.partName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )
        ) : (
          <CardMultiImageStrip
            key={`${part._id}-${images.join('|')}`}
            images={images}
            partName={part.partName}
            onImageClick={onImageClick}
          />
        )}
      </div>

      <div style={{ padding: '16px 20px 20px' }}>
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 16,
            fontWeight: 800,
            color: '#1a1a2e',
            marginBottom: 5,
            lineHeight: 1.3,
          }}
        >
          {part.partName}
        </div>

        {part.brand && (
          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                borderRadius: 6,
                padding: '3px 9px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {part.brand}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <span
            style={{
              background: '#eef2ff',
              border: '1px solid #c7d4ff',
              color: '#4f7cff',
              borderRadius: 6,
              padding: '3px 9px',
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            {codeDisplay}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 16,
            background: '#f7f8fc',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid #ebebf5',
          }}
        >
          {[
            { icon: '🔩', label: 'Part No.', value: part.partNumber },
            { icon: '📍', label: 'Location', value: part.location },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>{r.icon}</span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  color: '#a0a0bc',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  minWidth: 52,
                }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: '#3a3a5c',
                  fontWeight: 500,
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f0f4ff',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid #dce6ff',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                color: '#a0aacc',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}
            >
              Price
            </div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: '#4f7cff',
              }}
            >
              {priceLabel(part)}
            </div>
          </div>

          <div onClick={e => e.stopPropagation()}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                color: '#a0aacc',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                textAlign: 'center',
                marginBottom: 4,
              }}
            >
              Qty
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#fff',
                borderRadius: 10,
                border: '1.5px solid #dce6ff',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(79,124,255,0.08)',
              }}
            >
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onQuantityChange(part._id, -1);
                }}
                disabled={part.quantity === 0}
                style={{
                  width: 30,
                  height: 30,
                  border: 'none',
                  background: 'transparent',
                  color: part.quantity === 0 ? '#ccc' : '#4f7cff',
                  cursor: part.quantity === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  fontWeight: 700,
                }}
                onMouseEnter={e => {
                  if (part.quantity > 0) e.currentTarget.style.background = '#eef2ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                −
              </button>
              <span
                style={{
                  minWidth: 30,
                  textAlign: 'center',
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#1a1a2e',
                }}
              >
                {part.quantity}
              </span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onQuantityChange(part._id, 1);
                }}
                style={{
                  width: 30,
                  height: 30,
                  border: 'none',
                  background: 'transparent',
                  color: '#4f7cff',
                  cursor: 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  fontWeight: 700,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#eef2ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onEdit(part);
            }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              border: '1.5px solid #dce6ff',
              background: '#f0f4ff',
              color: '#4f7cff',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#4f7cff';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#4f7cff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f0f4ff';
              e.currentTarget.style.color = '#4f7cff';
              e.currentTarget.style.borderColor = '#dce6ff';
            }}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete(part);
            }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              border: '1.5px solid #ffddd6',
              background: '#fff5f3',
              color: '#e05a3a',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#e05a3a';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#e05a3a';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff5f3';
              e.currentTarget.style.color = '#e05a3a';
              e.currentTarget.style.borderColor = '#ffddd6';
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}
